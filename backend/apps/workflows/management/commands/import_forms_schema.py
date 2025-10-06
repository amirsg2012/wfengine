# apps/workflows/management/commands/import_forms_schema.py
import json
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.workflows.models_dynamic_forms import DynamicForm, FormSection, FormField


class Command(BaseCommand):
    help = 'Import forms from custom JSON schema format'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='Path to JSON file containing form schema'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing forms before import'
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        clear = options.get('clear', False)

        # Read JSON file
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                forms_data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f'File not found: {json_file}')
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON file: {e}')

        if not isinstance(forms_data, list):
            raise CommandError('JSON file must contain a list of form objects')

        # Clear existing forms if requested
        if clear:
            self.stdout.write(self.style.WARNING('Clearing all existing forms...'))
            DynamicForm.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleared all forms'))

        self.stdout.write(f'\nFound {len(forms_data)} forms in JSON')

        imported_forms = 0
        imported_sections = 0
        imported_fields = 0

        with transaction.atomic():
            for form_data in forms_data:
                try:
                    # Extract form number from code (e.g., "FORM_1" -> 1)
                    form_code = form_data.get('code', '')
                    form_number = int(form_code.split('_')[-1]) if '_' in form_code else 0

                    if form_number == 0:
                        self.stdout.write(
                            self.style.WARNING(f'⊘ Skipping form with invalid code: {form_code}')
                        )
                        continue

                    # Create or get form
                    form, created = DynamicForm.objects.update_or_create(
                        form_number=form_number,
                        defaults={
                            'title_en': form_data.get('name', ''),
                            'title_fa': form_data.get('name_fa', ''),
                            'description': form_data.get('description', ''),
                            'is_active': True,
                            'has_multiple_steps': False,
                            'total_steps': 1,
                            'display_order': form_number - 1,
                        }
                    )

                    action = 'Created' if created else 'Updated'
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ {action} Form {form_number}: {form.title_fa}')
                    )
                    if created:
                        imported_forms += 1

                    # Import sections
                    sections = form_data.get('sections', [])
                    for section_data in sections:
                        section_code = section_data.get('code', '')

                        section, section_created = FormSection.objects.update_or_create(
                            form=form,
                            code=section_code,
                            defaults={
                                'title_en': section_data.get('name', ''),
                                'title_fa': section_data.get('name_fa', ''),
                                'description': section_data.get('description', ''),
                                'display_order': section_data.get('order', 0),
                                'is_active': True,
                            }
                        )

                        if section_created:
                            imported_sections += 1
                            self.stdout.write(f'  ✓ Section: {section.title_fa}')

                        # Import fields
                        fields = section_data.get('fields', [])
                        for field_data in fields:
                            field_code = field_data.get('code', '')

                            # Handle options
                            options_json = None
                            if 'options' in field_data:
                                options_json = field_data['options']

                            # Map field types
                            field_type = field_data.get('field_type', 'TEXT').upper()

                            field, field_created = FormField.objects.update_or_create(
                                form=form,
                                section=section,
                                code=field_code,
                                defaults={
                                    'label_en': field_data.get('name', ''),
                                    'label_fa': field_data.get('name_fa', ''),
                                    'field_type': field_type,
                                    'is_required': field_data.get('is_required', False),
                                    'placeholder': field_data.get('placeholder', ''),
                                    'help_text': field_data.get('help_text', ''),
                                    'options_json': options_json,
                                    'default_value': field_data.get('default_value', ''),
                                    'display_order': field_data.get('order', 0),
                                    'is_active': True,
                                }
                            )

                            if field_created:
                                imported_fields += 1

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'✗ Error importing form {form_data.get("code")}: {e}')
                    )
                    import traceback
                    traceback.print_exc()

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\n✅ Import Complete!'))
        self.stdout.write(f'\nForms: {imported_forms}')
        self.stdout.write(f'Sections: {imported_sections}')
        self.stdout.write(f'Fields: {imported_fields}')
        self.stdout.write('\n' + '='*60)
