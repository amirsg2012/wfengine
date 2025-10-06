# apps/workflows/management/commands/import_forms_json.py
import json
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.workflows.models_dynamic_forms import DynamicForm, FormSection, FormField


class Command(BaseCommand):
    help = 'Import forms from JSON file (exported from Django admin)'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='Path to JSON file containing form data'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing forms before import'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing forms (match by form_number)'
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        clear = options.get('clear', False)
        update = options.get('update', False)

        # Read JSON file
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f'File not found: {json_file}')
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid JSON file: {e}')

        if not isinstance(data, list):
            raise CommandError('JSON file must contain a list of objects')

        # Clear existing forms if requested
        if clear:
            self.stdout.write(self.style.WARNING('Clearing all existing forms...'))
            DynamicForm.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleared all forms'))

        # Separate forms, sections, and fields
        forms_data = []
        sections_data = []
        fields_data = []

        for item in data:
            model = item.get('model', '')
            if model == 'workflows.dynamicform':
                forms_data.append(item)
            elif model == 'workflows.formsection':
                sections_data.append(item)
            elif model == 'workflows.formfield':
                fields_data.append(item)

        self.stdout.write(f'\nFound in JSON:')
        self.stdout.write(f'  - {len(forms_data)} forms')
        self.stdout.write(f'  - {len(sections_data)} sections')
        self.stdout.write(f'  - {len(fields_data)} fields')

        # Import forms
        imported_forms = 0
        updated_forms = 0
        skipped_forms = 0

        with transaction.atomic():
            # Import DynamicForms first
            for form_item in forms_data:
                fields = form_item['fields']
                form_number = fields['form_number']

                existing = DynamicForm.objects.filter(form_number=form_number).first()

                if existing and not update:
                    self.stdout.write(
                        self.style.WARNING(f'⊘ Form {form_number} already exists. Skipping.')
                    )
                    skipped_forms += 1
                    continue

                if existing and update:
                    # Update existing form
                    for key, value in fields.items():
                        if key not in ['created_at', 'updated_at']:
                            setattr(existing, key, value)
                    existing.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'↻ Updated Form {form_number}: {existing.title_fa}')
                    )
                    updated_forms += 1
                else:
                    # Create new form
                    form = DynamicForm.objects.create(
                        form_number=fields['form_number'],
                        title_en=fields.get('title_en', ''),
                        title_fa=fields.get('title_fa', ''),
                        state=fields.get('state'),
                        has_multiple_steps=fields.get('has_multiple_steps', False),
                        total_steps=fields.get('total_steps', 1),
                        description=fields.get('description', ''),
                        is_active=fields.get('is_active', True),
                        display_order=fields.get('display_order', 0),
                    )
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Imported Form {form_number}: {form.title_fa}')
                    )
                    imported_forms += 1

            # Import FormSections
            imported_sections = 0
            for section_item in sections_data:
                fields = section_item['fields']
                form_id = fields['form']

                # Find the form by form_number (not by pk)
                # We need to map old pk to new form
                # This is tricky - we'll need to match by form relationship
                try:
                    # Try to find form by ID or form_number from data
                    form = None
                    for form_data in forms_data:
                        if str(form_data['pk']) == str(form_id):
                            form_number = form_data['fields']['form_number']
                            form = DynamicForm.objects.get(form_number=form_number)
                            break

                    if not form:
                        self.stdout.write(
                            self.style.WARNING(f'⊘ Could not find form for section {fields.get("code")}')
                        )
                        continue

                    section, created = FormSection.objects.update_or_create(
                        form=form,
                        code=fields['code'],
                        defaults={
                            'title_en': fields.get('title_en', ''),
                            'title_fa': fields.get('title_fa', ''),
                            'display_order': fields.get('display_order', 0),
                            'description': fields.get('description', ''),
                            'required_step': fields.get('required_step'),
                            'requires_signature': fields.get('requires_signature', False),
                            'signature_field_code': fields.get('signature_field_code'),
                            'signature_step': fields.get('signature_step'),
                            'is_active': fields.get('is_active', True),
                        }
                    )
                    if created:
                        imported_sections += 1
                        self.stdout.write(f'  ✓ Section: {section.title_fa}')
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Error importing section: {e}')
                    )

            # Import FormFields
            imported_fields = 0
            for field_item in fields_data:
                fields = field_item['fields']
                form_id = fields['form']
                section_id = fields.get('section')

                try:
                    # Find form
                    form = None
                    for form_data in forms_data:
                        if str(form_data['pk']) == str(form_id):
                            form_number = form_data['fields']['form_number']
                            form = DynamicForm.objects.get(form_number=form_number)
                            break

                    if not form:
                        continue

                    # Find section if exists
                    section = None
                    if section_id:
                        for section_data in sections_data:
                            if str(section_data['pk']) == str(section_id):
                                section_code = section_data['fields']['code']
                                section = FormSection.objects.get(form=form, code=section_code)
                                break

                    field, created = FormField.objects.update_or_create(
                        form=form,
                        section=section,
                        code=fields['code'],
                        defaults={
                            'label_en': fields.get('label_en', ''),
                            'label_fa': fields.get('label_fa', ''),
                            'field_type': fields.get('field_type', 'TEXT'),
                            'is_required': fields.get('is_required', False),
                            'placeholder': fields.get('placeholder', ''),
                            'help_text': fields.get('help_text', ''),
                            'options_json': fields.get('options_json'),
                            'min_length': fields.get('min_length'),
                            'max_length': fields.get('max_length'),
                            'min_value': fields.get('min_value'),
                            'max_value': fields.get('max_value'),
                            'regex_pattern': fields.get('regex_pattern', ''),
                            'validation_message': fields.get('validation_message', ''),
                            'display_order': fields.get('display_order', 0),
                            'css_class': fields.get('css_class', ''),
                            'default_value': fields.get('default_value', ''),
                            'is_active': fields.get('is_active', True),
                        }
                    )
                    if created:
                        imported_fields += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Error importing field {fields.get("code")}: {e}')
                    )

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\n✅ Import Complete!'))
        self.stdout.write(f'\nForms:')
        self.stdout.write(f'  - Imported: {imported_forms}')
        self.stdout.write(f'  - Updated: {updated_forms}')
        self.stdout.write(f'  - Skipped: {skipped_forms}')
        self.stdout.write(f'\nSections: {imported_sections}')
        self.stdout.write(f'Fields: {imported_fields}')
        self.stdout.write('\n' + '='*60)
