# apps/workflows/management/commands/migrate_legacy_forms_to_dynamic.py
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.workflows.models_dynamic_forms import DynamicForm, FormSection, FormField
from apps.workflows.forms.registry import FormRegistry


class Command(BaseCommand):
    help = 'Migrate legacy hardcoded forms (form_1.py, form_2.py, form_3.py) to DynamicForm database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing DynamicForms before migration',
        )

    def handle(self, *args, **options):
        clear = options.get('clear', False)

        if clear:
            self.stdout.write('Clearing existing DynamicForms...')
            deleted = DynamicForm.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted[0]} DynamicForms'))

        self.stdout.write('Migrating legacy forms to DynamicForm database...')

        # Get all legacy forms
        legacy_forms = FormRegistry.get_all_forms()

        if not legacy_forms:
            self.stdout.write(self.style.WARNING('No legacy forms found to migrate'))
            return

        migrated_count = 0
        for form_number, form_class in legacy_forms.items():
            try:
                with transaction.atomic():
                    # Check if already exists
                    if DynamicForm.objects.filter(form_number=form_number).exists():
                        self.stdout.write(
                            self.style.WARNING(
                                f'Form {form_number} already exists in database. Skipping.'
                            )
                        )
                        continue

                    # Get schema from legacy form
                    schema = form_class.get_schema()

                    # Create DynamicForm
                    dynamic_form = DynamicForm.objects.create(
                        form_number=form_number,
                        title_en=form_class.form_title,
                        title_fa=getattr(form_class, 'form_title_fa', form_class.form_title),
                        description=f'Migrated from legacy form {form_number}',
                        is_active=True,
                        has_multiple_steps=getattr(form_class, 'has_multiple_steps', False),
                        total_steps=getattr(form_class, 'total_steps', 1),
                    )

                    # Parse schema and create sections/fields
                    self._create_sections_from_schema(dynamic_form, schema)

                    migrated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Migrated Form {form_number}: {form_class.form_title}'
                        )
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Failed to migrate Form {form_number}: {str(e)}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully migrated {migrated_count}/{len(legacy_forms)} forms!'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                'Forms are now available in database at /admin/workflows/dynamicform/'
            )
        )

    def _create_sections_from_schema(self, dynamic_form, schema):
        """Create FormSections and FormFields from JSON schema"""
        properties = schema.get('properties', {})

        # Track order
        section_order = 0
        field_order = 0

        for prop_key, prop_value in properties.items():
            # Skip metadata fields
            if prop_key in ['formTitle', 'formNumber']:
                continue

            prop_type = prop_value.get('type', 'string')

            # If it's an object, treat it as a section
            if prop_type == 'object':
                section = FormSection.objects.create(
                    form=dynamic_form,
                    code=prop_key,
                    title_en=self._humanize(prop_key),
                    title_fa=self._humanize(prop_key),  # TODO: Add proper Persian names
                    display_order=section_order,
                )
                section_order += 1

                # Create fields for this section
                section_properties = prop_value.get('properties', {})
                field_order = 0
                for field_key, field_value in section_properties.items():
                    self._create_field(section, field_key, field_value, field_order)
                    field_order += 1

            else:
                # Top-level field - create a default section
                section, _ = FormSection.objects.get_or_create(
                    form=dynamic_form,
                    code='_default',
                    defaults={
                        'title_en': 'General Information',
                        'title_fa': 'اطلاعات عمومی',
                        'display_order': 0,
                    }
                )
                self._create_field(section, prop_key, prop_value, field_order)
                field_order += 1

    def _create_field(self, section, field_key, field_schema, order):
        """Create a FormField from schema property"""
        field_type = field_schema.get('type', 'string')
        field_format = field_schema.get('format', '')

        # Map JSON schema types to FormField types
        type_mapping = {
            ('string', 'date'): 'DATE',
            ('string', 'date-time'): 'DATETIME',
            ('string', 'email'): 'EMAIL',
            ('string', ''): 'TEXT',
            ('number', ''): 'NUMBER',
            ('integer', ''): 'NUMBER',
            ('boolean', ''): 'BOOLEAN',
        }

        mapped_type = type_mapping.get((field_type, field_format), 'TEXT')

        # Handle special cases
        if 'signature' in field_key.lower():
            mapped_type = 'SIGNATURE'
        elif field_schema.get('enum'):
            mapped_type = 'SELECT'

        # Build options JSON
        options_json = None
        if mapped_type == 'SELECT' and field_schema.get('enum'):
            options_json = {
                'options': field_schema.get('enum'),
                'type': field_type,
                'format': field_format if field_format else None
            }
        elif field_format:
            options_json = {
                'type': field_type,
                'format': field_format
            }

        FormField.objects.create(
            section=section,
            form=section.form,
            code=field_key,
            label_en=self._humanize(field_key),
            label_fa=self._humanize(field_key),  # TODO: Add proper Persian labels
            field_type=mapped_type,
            display_order=order,
            is_required=field_schema.get('required', False),
            options_json=options_json,
        )

    def _humanize(self, code):
        """Convert camelCase to Human Readable"""
        import re
        # Insert space before capital letters
        result = re.sub(r'([A-Z])', r' \1', code)
        # Capitalize first letter
        return result.strip().title()
