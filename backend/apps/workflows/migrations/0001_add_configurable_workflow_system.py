# Generated manually for configurable workflow system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django_mongodb_backend.fields import ObjectIdAutoField


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # First, create base Workflow model
        migrations.CreateModel(
            name='Workflow',
            fields=[
                ('id', ObjectIdAutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=300)),
                ('body', models.TextField(blank=True, default='')),
                ('state', models.CharField(
                    choices=[
                        ('ApplicantRequest', 'ApplicantRequest'),
                        ('CEOInstruction', 'CEOInstruction'),
                        ('Form1', 'Form1'),
                        ('Form2', 'Form2'),
                        ('DocsCollection', 'DocsCollection'),
                        ('Form3', 'Form3'),
                        ('Form4', 'Form4'),
                        ('AMLForm', 'AMLForm'),
                        ('EvaluationCommittee', 'EvaluationCommittee'),
                        ('AppraisalFeeDeposit', 'AppraisalFeeDeposit'),
                        ('AppraisalNotice', 'AppraisalNotice'),
                        ('AppraisalOpinion', 'AppraisalOpinion'),
                        ('AppraisalDecision', 'AppraisalDecision'),
                        ('Settlment', 'Settlment'),
                    ],
                    default='ApplicantRequest',
                    max_length=50
                )),
                ('_data', models.TextField(blank=True, db_column='data', default='{}')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='workflows', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'workflows_workflow',
            },
        ),

        # Create Action model
        migrations.CreateModel(
            name='Action',
            fields=[
                ('id', ObjectIdAutoField(primary_key=True, serialize=False)),
                ('state', models.CharField(max_length=64)),
                ('step', models.IntegerField(help_text='0-based for approvals')),
                ('action_type', models.CharField(choices=[('APPROVE', 'Approve'), ('UPLOAD', 'Upload'), ('COMMENT', 'Comment')], max_length=64)),
                ('role_code', models.CharField(blank=True, max_length=64, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('performer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='actions', to='workflows.workflow')),
            ],
            options={
                'unique_together': {('workflow', 'state', 'step')},
            },
        ),

        # Create Attachment model
        migrations.CreateModel(
            name='Attachment',
            fields=[
                ('id', ObjectIdAutoField(primary_key=True, serialize=False)),
                ('file', models.FileField(upload_to='attachments/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='workflows.workflow')),
            ],
        ),

        # Create Comment model
        migrations.CreateModel(
            name='Comment',
            fields=[
                ('id', ObjectIdAutoField(primary_key=True, serialize=False)),
                ('text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='workflows.workflow')),
            ],
        ),

        # Create WorkflowTemplate model
        migrations.CreateModel(
            name='WorkflowTemplate',
            fields=[
                ('id', ObjectIdAutoField(primary_key=True, serialize=False)),
                ('code', models.CharField(help_text="Unique code (e.g., 'PROPERTY_ACQUISITION')", max_length=64, unique=True)),
                ('name', models.CharField(help_text='Template name in English', max_length=255)),
                ('name_fa', models.CharField(help_text='Template name in Persian', max_length=255)),
                ('description', models.TextField(blank=True, help_text='Template description')),
                ('is_active', models.BooleanField(default=True, help_text='Is this template active?')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_templates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Workflow Template',
                'verbose_name_plural': 'Workflow Templates',
                'db_table': 'workflows_workflow_template',
            },
        ),

        # Create WorkflowState model
        migrations.CreateModel(
            name='WorkflowState',
            fields=[
                ('id', ObjectIdAutoField(primary_key=True, serialize=False)),
                ('code', models.CharField(help_text="State code (e.g., 'APPLICANT_REQUEST')", max_length=64)),
                ('name', models.CharField(help_text='State name in English', max_length=255)),
                ('name_fa', models.CharField(help_text='State name in Persian', max_length=255)),
                ('description', models.TextField(blank=True, help_text='State description')),
                ('state_type', models.CharField(choices=[('FORM', 'Form State'), ('APPROVAL', 'Approval State'), ('REVIEW', 'Review State'), ('AUTOMATIC', 'Automatic State')], default='APPROVAL', help_text='Type of state (form/approval/review/automatic)', max_length=32)),
                ('form_number', models.IntegerField(blank=True, help_text='If state_type=FORM, which form number to use?', null=True)),
                ('form_schema', models.JSONField(blank=True, help_text='JSON schema for the form (for future dynamic forms)', null=True)),
                ('order', models.IntegerField(default=0, help_text='Display order')),
                ('is_initial', models.BooleanField(default=False, help_text='Is this the starting state?')),
                ('is_terminal', models.BooleanField(default=False, help_text='Is this an ending state?')),
                ('allow_edit', models.BooleanField(default=True, help_text='Can data be edited in this state?')),
                ('allow_back', models.BooleanField(default=False, help_text='Can go back to previous state?')),
                ('require_all_steps', models.BooleanField(default=True, help_text='All approval steps required? (vs any step)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('template', models.ForeignKey(help_text='Workflow template this state belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='states', to='workflows.workflowtemplate')),
            ],
            options={
                'verbose_name': 'Workflow State',
                'verbose_name_plural': 'Workflow States',
                'db_table': 'workflows_workflow_state',
                'ordering': ['order'],
            },
        ),

        # Create WorkflowStateStep model
        migrations.CreateModel(
            name='WorkflowStateStep',
            fields=[
                ('id', ObjectIdAutoField(primary_key=True, serialize=False)),
                ('step_number', models.IntegerField(help_text='Step index (0-based)')),
                ('name', models.CharField(help_text='Step name in English', max_length=255)),
                ('name_fa', models.CharField(help_text='Step name in Persian', max_length=255)),
                ('description', models.TextField(blank=True, help_text='Step description')),
                ('requires_signature', models.BooleanField(default=False, help_text='Does this step require a signature?')),
                ('signature_field_path', models.CharField(blank=True, help_text="JSON path to signature field (e.g., 'approvals.managerSignature')", max_length=255)),
                ('requires_comment', models.BooleanField(default=False, help_text='Does this step require a comment?')),
                ('editable_fields', models.JSONField(blank=True, default=list, help_text='List of field paths this step can edit')),
                ('parallel_group', models.IntegerField(blank=True, help_text='Steps with same group number can be done in parallel', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('state', models.ForeignKey(help_text='State this step belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='steps', to='workflows.workflowstate')),
            ],
            options={
                'verbose_name': 'Workflow State Step',
                'verbose_name_plural': 'Workflow State Steps',
                'db_table': 'workflows_workflow_state_step',
                'ordering': ['step_number'],
            },
        ),

        # Create WorkflowTransition model
        migrations.CreateModel(
            name='WorkflowTransition',
            fields=[
                ('id', ObjectIdAutoField(primary_key=True, serialize=False)),
                ('name', models.CharField(help_text='Transition name in English', max_length=255)),
                ('name_fa', models.CharField(help_text='Transition name in Persian', max_length=255)),
                ('is_automatic', models.BooleanField(default=False, help_text='Auto-transition when conditions met?')),
                ('condition_type', models.CharField(choices=[('ALWAYS', 'Always Allowed'), ('ALL_STEPS_APPROVED', 'All Steps Approved'), ('ANY_STEP_APPROVED', 'Any Step Approved'), ('CUSTOM_LOGIC', 'Custom Logic'), ('FIELD_VALUE', 'Based on Field Value')], default='ALL_STEPS_APPROVED', help_text='Type of condition to check', max_length=32)),
                ('condition_config', models.JSONField(blank=True, default=dict, help_text='Additional condition configuration (JSON)')),
                ('order', models.IntegerField(default=0, help_text='Display order')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('from_state', models.ForeignKey(help_text='Source state', on_delete=django.db.models.deletion.CASCADE, related_name='transitions_from', to='workflows.workflowstate')),
                ('to_state', models.ForeignKey(help_text='Target state', on_delete=django.db.models.deletion.CASCADE, related_name='transitions_to', to='workflows.workflowstate')),
                ('template', models.ForeignKey(help_text='Workflow template this transition belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='transitions', to='workflows.workflowtemplate')),
            ],
            options={
                'verbose_name': 'Workflow Transition',
                'verbose_name_plural': 'Workflow Transitions',
                'db_table': 'workflows_workflow_transition',
                'ordering': ['order'],
            },
        ),

        # Add new fields to existing Workflow model
        migrations.AddField(
            model_name='workflow',
            name='template',
            field=models.ForeignKey(blank=True, help_text='Workflow template (for configurable workflows)', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='instances', to='workflows.workflowtemplate'),
        ),
        migrations.AddField(
            model_name='workflow',
            name='current_state',
            field=models.ForeignKey(blank=True, help_text='Current state (for configurable workflows)', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='workflow_instances', to='workflows.workflowstate'),
        ),
        migrations.AddField(
            model_name='workflow',
            name='current_step',
            field=models.IntegerField(default=0, help_text='Current step number within the state (0-based)'),
        ),
        migrations.AddField(
            model_name='workflow',
            name='completed_steps',
            field=models.JSONField(blank=True, default=dict, help_text='Completed steps per state {state_id: {step_num: {by, at, data}}}'),
        ),

        # Add indexes
        migrations.AddIndex(
            model_name='workflowstate',
            index=models.Index(fields=['template', 'order'], name='workflows_w_templat_5efea5_idx'),
        ),
        migrations.AddIndex(
            model_name='workflowstate',
            index=models.Index(fields=['template', 'is_initial'], name='workflows_w_templat_0904e6_idx'),
        ),
        migrations.AddIndex(
            model_name='workflowstatestep',
            index=models.Index(fields=['state', 'step_number'], name='workflows_w_state_i_d23456_idx'),
        ),
        migrations.AddIndex(
            model_name='workflowtransition',
            index=models.Index(fields=['template', 'from_state'], name='workflows_w_templat_53e6df_idx'),
        ),
        migrations.AddIndex(
            model_name='workflowtransition',
            index=models.Index(fields=['from_state', 'to_state'], name='workflows_w_from_st_470ccd_idx'),
        ),

        # Add unique constraints
        migrations.AlterUniqueTogether(
            name='workflowstate',
            unique_together={('template', 'code')},
        ),
        migrations.AlterUniqueTogether(
            name='workflowstatestep',
            unique_together={('state', 'step_number')},
        ),
    ]
