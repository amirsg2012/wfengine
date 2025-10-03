"""
Management command to migrate legacy forms (Form1, Form2, Form3) to DynamicForm records.

Usage:
    python manage.py migrate_legacy_forms
    python manage.py migrate_legacy_forms --clear
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.forms.models import DynamicForm, FormSection, FormField, FormFieldMapping

User = get_user_model()


class Command(BaseCommand):
    help = 'Migrate legacy Form1, Form2, Form3 to DynamicForm records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing dynamic forms before migration',
        )

    def handle(self, *args, **options):
        # Get admin user for created_by field
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            self.stdout.write(self.style.ERROR('No admin user found. Please create one first.'))
            return

        self.admin_user = admin_user

        if options['clear']:
            self.stdout.write('Clearing existing dynamic forms...')
            DynamicForm.objects.filter(code__in=['FORM_1', 'FORM_2', 'FORM_3']).delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleared existing forms'))

        self.stdout.write('\nCreating dynamic forms from legacy forms...')

        self.create_form_1()
        self.create_form_2()
        self.create_form_3()

        self.stdout.write(self.style.SUCCESS('\n✓ Successfully migrated all legacy forms'))

    def create_form_1(self):
        """Create Form 1: Applicant Information"""
        self.stdout.write('  Creating Form 1...')

        form = DynamicForm.objects.create(
            code='FORM_1',
            name='Form 1: Applicant Information',
            name_fa='فرم ۱: اطلاعات متقاضی',
            description='Basic applicant information form',
            form_number=1,
            is_active=True,
            created_by=self.admin_user
        )

        # Personal Information Section
        section1 = FormSection.objects.create(
            form=form,
            code='personal_info',
            name='Personal Information',
            name_fa='اطلاعات شخصی',
            order=1
        )

        personal_fields = [
            ('firstName', 'First Name', 'نام', 'TEXT', True, 'half'),
            ('lastName', 'Last Name', 'نام خانوادگی', 'TEXT', True, 'half'),
            ('nationalCode', 'National Code', 'کد ملی', 'TEXT', True, 'half'),
            ('birthDate', 'Birth Date', 'تاریخ تولد', 'DATE', True, 'half'),
            ('fatherName', 'Father Name', 'نام پدر', 'TEXT', True, 'half'),
            ('birthCertificateNumber', 'Birth Certificate Number', 'شماره شناسنامه', 'TEXT', True, 'half'),
        ]

        for idx, (code, name, name_fa, field_type, required, width) in enumerate(personal_fields):
            field = FormField.objects.create(
                code=f'form1_{code}',
                name=name,
                name_fa=name_fa,
                field_type=field_type,
                is_required=required,
                display_order=idx + 1,
                width=width,
                data_path=f'personalInformation.{code}',
                created_by=self.admin_user
            )
            FormFieldMapping.objects.create(
                section=section1,
                field=field,
                order=idx + 1
            )

        # Contact Information Section
        section2 = FormSection.objects.create(
            form=form,
            code='contact_info',
            name='Contact Information',
            name_fa='اطلاعات تماس',
            order=2
        )

        contact_fields = [
            ('phoneNumber', 'Phone Number', 'شماره تلفن', 'PHONE', True, 'half'),
            ('email', 'Email', 'ایمیل', 'EMAIL', False, 'half'),
            ('address', 'Address', 'آدرس', 'TEXTAREA', True, 'full'),
            ('postalCode', 'Postal Code', 'کد پستی', 'TEXT', False, 'half'),
        ]

        for idx, (code, name, name_fa, field_type, required, width) in enumerate(contact_fields):
            field = FormField.objects.create(
                code=f'form1_{code}',
                name=name,
                name_fa=name_fa,
                field_type=field_type,
                is_required=required,
                display_order=idx + 1,
                width=width,
                data_path=f'contactInformation.{code}',
                created_by=self.admin_user
            )
            FormFieldMapping.objects.create(
                section=section2,
                field=field,
                order=idx + 1
            )

        self.stdout.write(self.style.SUCCESS('    ✓ Created Form 1'))

    def create_form_2(self):
        """Create Form 2: Property Details"""
        self.stdout.write('  Creating Form 2...')

        form = DynamicForm.objects.create(
            code='FORM_2',
            name='Form 2: Property Details',
            name_fa='فرم ۲: مشخصات ملک',
            description='Property information and details',
            form_number=2,
            is_active=True,
            created_by=self.admin_user
        )

        # Property Information Section
        section1 = FormSection.objects.create(
            form=form,
            code='property_info',
            name='Property Information',
            name_fa='اطلاعات ملک',
            order=1
        )

        property_fields = [
            ('propertyType', 'Property Type', 'نوع ملک', 'SELECT', True, 'half', [
                {'value': 'land', 'label_fa': 'زمین'},
                {'value': 'apartment', 'label_fa': 'آپارتمان'},
                {'value': 'villa', 'label_fa': 'ویلا'},
                {'value': 'commercial', 'label_fa': 'تجاری'},
            ]),
            ('propertyAddress', 'Property Address', 'آدرس ملک', 'TEXTAREA', True, 'full', None),
            ('propertyArea', 'Property Area (sq m)', 'مساحت (متر مربع)', 'NUMBER', True, 'half', None),
            ('registrationNumber', 'Registration Number', 'شماره ثبت', 'TEXT', False, 'half', None),
            ('documentType', 'Document Type', 'نوع سند', 'SELECT', True, 'half', [
                {'value': 'ownership', 'label_fa': 'سند مالکیت'},
                {'value': 'lease', 'label_fa': 'اجاره'},
                {'value': 'other', 'label_fa': 'سایر'},
            ]),
        ]

        for idx, field_data in enumerate(property_fields):
            code, name, name_fa, field_type, required, width, options = field_data
            field = FormField.objects.create(
                code=f'form2_{code}',
                name=name,
                name_fa=name_fa,
                field_type=field_type,
                is_required=required,
                display_order=idx + 1,
                width=width,
                options=options or [],
                data_path=f'propertyDetails.{code}',
                created_by=self.admin_user
            )
            FormFieldMapping.objects.create(
                section=section1,
                field=field,
                order=idx + 1
            )

        # Valuation Information Section
        section2 = FormSection.objects.create(
            form=form,
            code='valuation_info',
            name='Valuation Information',
            name_fa='اطلاعات ارزیابی',
            order=2
        )

        valuation_fields = [
            ('estimatedValue', 'Estimated Value', 'ارزش تخمینی', 'NUMBER', False, 'half'),
            ('requestedLoanAmount', 'Requested Loan Amount', 'مبلغ وام درخواستی', 'NUMBER', True, 'half'),
            ('propertyUsage', 'Property Usage', 'کاربری ملک', 'TEXT', False, 'half'),
            ('additionalNotes', 'Additional Notes', 'توضیحات تکمیلی', 'TEXTAREA', False, 'full'),
        ]

        for idx, (code, name, name_fa, field_type, required, width) in enumerate(valuation_fields):
            field = FormField.objects.create(
                code=f'form2_{code}',
                name=name,
                name_fa=name_fa,
                field_type=field_type,
                is_required=required,
                display_order=idx + 1,
                width=width,
                data_path=f'valuationInformation.{code}',
                created_by=self.admin_user
            )
            FormFieldMapping.objects.create(
                section=section2,
                field=field,
                order=idx + 1
            )

        self.stdout.write(self.style.SUCCESS('    ✓ Created Form 2'))

    def create_form_3(self):
        """Create Form 3: Property Status Review"""
        self.stdout.write('  Creating Form 3...')

        form = DynamicForm.objects.create(
            code='FORM_3',
            name='Form 3: Property Status Review',
            name_fa='فرم ۳: بررسی وضعیت ملک',
            description='Multi-step property review and approval form',
            form_number=3,
            is_active=True,
            created_by=self.admin_user
        )

        # Legal Deputy Report Section
        section1 = FormSection.objects.create(
            form=form,
            code='legal_deputy_report',
            name='Legal Deputy Report',
            name_fa='گزارش معاون حقوقی',
            order=1
        )

        legal_fields = [
            ('legalStatus', 'Legal Status', 'وضعیت حقوقی', 'TEXTAREA', True, 'full'),
            ('legalRemarks', 'Legal Remarks', 'توضیحات حقوقی', 'TEXTAREA', False, 'full'),
        ]

        for idx, (code, name, name_fa, field_type, required, width) in enumerate(legal_fields):
            field = FormField.objects.create(
                code=f'form3_{code}',
                name=name,
                name_fa=name_fa,
                field_type=field_type,
                is_required=required,
                display_order=idx + 1,
                width=width,
                data_path=f'legalDeputyReport.{code}',
                created_by=self.admin_user
            )
            FormFieldMapping.objects.create(
                section=section1,
                field=field,
                order=idx + 1
            )

        # Technical Review Section
        section2 = FormSection.objects.create(
            form=form,
            code='technical_review',
            name='Technical Review',
            name_fa='بررسی فنی',
            order=2
        )

        technical_fields = [
            ('technicalStatus', 'Technical Status', 'وضعیت فنی', 'TEXTAREA', True, 'full', None),
            ('structuralCondition', 'Structural Condition', 'وضعیت ساختاری', 'SELECT', True, 'half', [
                {'value': 'excellent', 'label_fa': 'عالی'},
                {'value': 'good', 'label_fa': 'خوب'},
                {'value': 'fair', 'label_fa': 'متوسط'},
                {'value': 'poor', 'label_fa': 'ضعیف'},
            ]),
            ('technicalRemarks', 'Technical Remarks', 'توضیحات فنی', 'TEXTAREA', False, 'full', None),
        ]

        for idx, field_data in enumerate(technical_fields):
            if len(field_data) == 7:
                code, name, name_fa, field_type, required, width, options = field_data
            else:
                code, name, name_fa, field_type, required, width = field_data
                options = None

            field = FormField.objects.create(
                code=f'form3_{code}',
                name=name,
                name_fa=name_fa,
                field_type=field_type,
                is_required=required,
                display_order=idx + 1,
                width=width,
                options=options or [],
                data_path=f'technicalReview.{code}',
                created_by=self.admin_user
            )
            FormFieldMapping.objects.create(
                section=section2,
                field=field,
                order=idx + 1
            )

        # Manager Approvals Section
        section3 = FormSection.objects.create(
            form=form,
            code='manager_approvals',
            name='Manager Approvals',
            name_fa='تاییدیه‌های مدیریت',
            order=3
        )

        approval_fields = [
            ('legalManagerApproval', 'Legal Manager Approval', 'تایید مدیر حقوقی', 'CHECKBOX', False, 'half'),
            ('acquisitionManagerApproval', 'Acquisition Manager Approval', 'تایید مدیر اکتساب', 'CHECKBOX', False, 'half'),
            ('realEstateManagerApproval', 'Real Estate Manager Approval', 'تایید مدیر املاک', 'CHECKBOX', False, 'half'),
            ('ceoApproval', 'CEO Approval', 'تایید مدیرعامل', 'CHECKBOX', False, 'half'),
        ]

        for idx, (code, name, name_fa, field_type, required, width) in enumerate(approval_fields):
            field = FormField.objects.create(
                code=f'form3_{code}',
                name=name,
                name_fa=name_fa,
                field_type=field_type,
                is_required=required,
                display_order=idx + 1,
                width=width,
                data_path=f'managerApprovals.{code}',
                created_by=self.admin_user
            )
            FormFieldMapping.objects.create(
                section=section3,
                field=field,
                order=idx + 1,
                is_readonly=True
            )

        self.stdout.write(self.style.SUCCESS('    ✓ Created Form 3'))
