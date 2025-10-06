# backend/apps/forms/management/commands/add_signature_fields.py
"""
Management command to add signature fields to a form

Usage:
    python manage.py add_signature_fields --form FORM_3 --count 4
"""
from django.core.management.base import BaseCommand
from apps.forms.models import DynamicForm, FormField, FormSection, FormFieldMapping, FieldType


class Command(BaseCommand):
    help = 'Add signature fields to a form'

    def add_arguments(self, parser):
        parser.add_argument(
            '--form',
            type=str,
            required=True,
            help='Form code (e.g., FORM_1, FORM_2, FORM_3)'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=4,
            help='Number of signature fields to add (default: 4)'
        )
        parser.add_argument(
            '--section',
            type=str,
            default=None,
            help='Section code to add signatures to (optional, will create new section if not provided)'
        )

    def handle(self, *args, **options):
        form_code = options['form']
        count = options['count']
        section_code = options['section']

        try:
            # Get the form
            form = DynamicForm.objects.get(code=form_code)
            self.stdout.write(f"Found form: {form.name_fa} ({form.code})")

            # Get or create signature section
            if section_code:
                try:
                    section = FormSection.objects.get(code=section_code, form=form)
                    self.stdout.write(f"Using existing section: {section.name_fa}")
                except FormSection.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"Section {section_code} not found"))
                    return
            else:
                # Create new signatures section
                section, created = FormSection.objects.get_or_create(
                    form=form,
                    code=f'{form_code.lower()}_signatures',
                    defaults={
                        'name': 'Signatures',
                        'name_fa': 'امضاها',
                        'description': 'Digital signature fields',
                        'order': 999  # Put at the end
                    }
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f"Created new section: {section.name_fa}"))
                else:
                    self.stdout.write(f"Using existing section: {section.name_fa}")

            # Get max order in section
            existing_mappings = FormFieldMapping.objects.filter(section=section)
            max_order = max([m.order for m in existing_mappings], default=0)

            # Create signature fields
            for i in range(1, count + 1):
                field_code = f'{form_code.lower()}_signature_{i}'
                field_name = f'Signature {i}'
                field_name_fa = f'امضای {i}'

                # Create FormField
                field, field_created = FormField.objects.get_or_create(
                    code=field_code,
                    defaults={
                        'name': field_name,
                        'name_fa': field_name_fa,
                        'field_type': FieldType.SIGNATURE,
                        'description': f'Digital signature field {i}',
                        'is_required': False,  # Signatures are typically optional
                        'placeholder': '',
                        'placeholder_fa': 'برای امضا کلیک کنید',
                    }
                )

                if field_created:
                    self.stdout.write(self.style.SUCCESS(f"  Created field: {field.name_fa} ({field.code})"))
                else:
                    self.stdout.write(f"  Field already exists: {field.name_fa} ({field.code})")

                # Create or update mapping
                mapping, mapping_created = FormFieldMapping.objects.get_or_create(
                    section=section,
                    field=field,
                    defaults={
                        'order': max_order + i,
                        'is_visible': True,
                        'is_required_override': None,
                        'custom_label_fa': None,
                    }
                )

                if mapping_created:
                    self.stdout.write(f"    Added to section at position {max_order + i}")
                else:
                    self.stdout.write(f"    Already in section")

            self.stdout.write(self.style.SUCCESS(f"\n✅ Successfully added {count} signature fields to {form.name_fa}"))
            self.stdout.write(f"\nYou can now use these fields in your form. Users will need to:")
            self.stdout.write("  1. Upload their signature in their profile")
            self.stdout.write("  2. Click 'اعمال امضای من' button to apply their signature")

        except DynamicForm.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Form '{form_code}' not found"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
            import traceback
            traceback.print_exc()
