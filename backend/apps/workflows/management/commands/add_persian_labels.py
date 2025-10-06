# apps/workflows/management/commands/add_persian_labels.py
from django.core.management.base import BaseCommand
from apps.workflows.models_dynamic_forms import FormField, FormSection

class Command(BaseCommand):
    help = 'Add Persian labels to form fields and sections'

    # Persian translations for common fields
    FIELD_TRANSLATIONS = {
        'firstName': 'نام',
        'lastName': 'نام خانوادگی',
        'birthCertificateNumber': 'شماره شناسنامه',
        'nationalCode': 'کد ملی',
        'residenceAddress': 'آدرس محل سکونت',
        'emergencyContactNumbers': 'شماره تماس اضطراری',
        'landlineNumber': 'شماره تلفن ثابت',
        'mobileNumber': 'شماره موبایل',
        'role': 'نقش',
        'ownershipType': 'نوع مالکیت',
        'ownershipDeed': 'سند مالکیت',
        'file': 'فایل',
        'type': 'نوع',
        'benchagh': 'بنچاق',
        'buildingPermit': 'پروانه ساختمانی',
        'date': 'تاریخ',
        'certificateOfNoViolation': 'گواهی عدم تخلف',
        'buildingCompletionCertificate': 'پایان کار ساختمان',
        'representationDocument': 'سند نمایندگی',
        'imageFiles': 'تصاویر',
        'propertyRegistrationPlateNumber': 'شماره پلاک ثبتی',
        'reviewer': 'بررسی کننده',
        'name': 'نام',
        'signatureUrl': 'امضا',
        'signatureHash': 'هش امضا',
        'signedBy': 'امضا کننده',
        'signedAt': 'تاریخ امضا',
    }

    SECTION_TRANSLATIONS = {
        'personalInformation': 'اطلاعات شخصی',
        'roleAndOwnership': 'نقش و مالکیت',
        'submittedDocuments': 'اسناد ارسالی',
        'propertyInformation': 'اطلاعات ملک',
        'legalDeputyReport': 'گزارش معاونت حقوقی',
        'realEstateTechnicalReport': 'گزارش فنی املاک',
        'approvals': 'تاییدیه‌ها',
    }

    def handle(self, *args, **options):
        self.stdout.write('Adding Persian labels to fields...')

        updated_fields = 0
        for field in FormField.objects.all():
            if field.code in self.FIELD_TRANSLATIONS:
                old_label = field.label_fa
                field.label_fa = self.FIELD_TRANSLATIONS[field.code]
                field.save()
                self.stdout.write(f'  ✓ {field.code}: {old_label} → {field.label_fa}')
                updated_fields += 1

        self.stdout.write(self.style.SUCCESS(f'\n✅ Updated {updated_fields} field labels'))

        self.stdout.write('\nAdding Persian labels to sections...')

        updated_sections = 0
        for section in FormSection.objects.all():
            if section.code in self.SECTION_TRANSLATIONS:
                old_title = section.title_fa
                section.title_fa = self.SECTION_TRANSLATIONS[section.code]
                section.save()
                self.stdout.write(f'  ✓ {section.code}: {old_title} → {section.title_fa}')
                updated_sections += 1

        self.stdout.write(self.style.SUCCESS(f'\n✅ Updated {updated_sections} section titles'))
        self.stdout.write(self.style.SUCCESS('\n🎉 Persian labels added successfully!'))
