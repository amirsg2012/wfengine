# Forms Import/Export Guide

## Overview
You can export and import Dynamic Forms (including all sections and fields) using JSON files. Two formats are supported:

1. **Django dumpdata format** - Standard Django export format (use `import_forms_json`)
2. **Custom schema format** - Your custom form definition format (use `import_forms_schema`)

## Exporting Forms

### Export all forms to JSON:
```bash
docker compose exec backend python manage.py dumpdata workflows.DynamicForm workflows.FormSection workflows.FormField --indent 2 --output /tmp/forms_export.json
```

### Copy export to host machine:
```bash
docker compose cp backend:/tmp/forms_export.json ./my_forms.json
```

### Export from Django Admin:
1. Go to `/admin/workflows/dynamicform/`
2. Select forms to export
3. Choose "Export selected forms" action
4. Save the JSON file

## Importing Forms

### Import from Custom Schema Format (Your Format):
```bash
# Copy JSON file to container
docker compose cp ./forms.json backend:/app/forms.json

# Import forms (clears existing forms)
docker compose exec backend python manage.py import_forms_schema /app/forms.json --clear
```

### Import from Django Dumpdata Format:
```bash
# Copy JSON file to container
docker compose cp ./my_forms.json backend:/tmp/forms.json

# Import forms
docker compose exec backend python manage.py import_forms_json /tmp/forms.json
```

### Import Options:

**Clear all existing forms before import:**
```bash
docker compose exec backend python manage.py import_forms_json /tmp/forms.json --clear
```

**Update existing forms (match by form_number):**
```bash
docker compose exec backend python manage.py import_forms_json /tmp/forms.json --update
```

**Import from host directly:**
```bash
# Place your JSON file in the project directory
docker compose exec backend python manage.py import_forms_json /app/my_forms.json
```

## JSON File Structure

The JSON file contains an array of objects with this structure:

```json
[
  {
    "model": "workflows.dynamicform",
    "pk": "...",
    "fields": {
      "form_number": 1,
      "title_en": "Form Title",
      "title_fa": "عنوان فرم",
      "description": "...",
      "is_active": true,
      ...
    }
  },
  {
    "model": "workflows.formsection",
    "pk": "...",
    "fields": {
      "form": "...",
      "code": "sectionCode",
      "title_fa": "عنوان بخش",
      ...
    }
  },
  {
    "model": "workflows.formfield",
    "pk": "...",
    "fields": {
      "form": "...",
      "section": "...",
      "code": "fieldCode",
      "label_fa": "برچسب فیلد",
      "field_type": "TEXT",
      ...
    }
  }
]
```

## Common Use Cases

### 1. Backup Forms Before Changes:
```bash
# Export current forms
docker compose exec backend python manage.py dumpdata workflows.DynamicForm workflows.FormSection workflows.FormField --indent 2 --output /tmp/backup_$(date +%Y%m%d).json

# Copy to host
docker compose cp backend:/tmp/backup_$(date +%Y%m%d).json ./backups/
```

### 2. Restore from Backup:
```bash
# Copy backup to container
docker compose cp ./backups/backup_20251006.json backend:/tmp/restore.json

# Clear and import
docker compose exec backend python manage.py import_forms_json /tmp/restore.json --clear
```

### 3. Clone Forms to Another Environment:
```bash
# Export from dev
docker compose exec backend python manage.py dumpdata workflows.DynamicForm workflows.FormSection workflows.FormField --indent 2 --output /tmp/forms.json

# Copy to production server and import
scp forms.json production:/path/to/project/
ssh production "cd /path/to/project && docker compose exec backend python manage.py import_forms_json /app/forms.json"
```

### 4. Import New Forms Without Affecting Existing:
```bash
# Import will skip existing forms (matched by form_number)
docker compose exec backend python manage.py import_forms_json /tmp/new_forms.json
```

### 5. Update Existing Forms:
```bash
# Update existing forms with new data
docker compose exec backend python manage.py import_forms_json /tmp/updated_forms.json --update
```

## Import Command Output

The command provides detailed feedback:

```
Found in JSON:
  - 3 forms
  - 12 sections
  - 45 fields

✓ Imported Form 1: فرم مشخصات
  ✓ Section: اطلاعات شخصی
  ✓ Section: اسناد
...

============================================================
✅ Import Complete!

Forms:
  - Imported: 3
  - Updated: 0
  - Skipped: 0

Sections: 12
Fields: 45
============================================================
```

## Current Backup

A backup of your current forms has been saved to:
- `forms_backup.json` (in project root)

This contains all 3 forms with their sections and fields including the Persian labels that were just added.

## Notes

- The import command matches forms by `form_number`, not by primary key (pk)
- Sections are matched by `form` + `code`
- Fields are matched by `form` + `section` + `code`
- Use `--clear` with caution - it deletes ALL existing forms
- The JSON file must be accessible from inside the Docker container
- Persian labels (label_fa, title_fa) are preserved during export/import

## Custom Schema Format

Your JSON file uses this custom format:

```json
[
  {
    "code": "FORM_1",
    "name": "Form Title (English)",
    "name_fa": "عنوان فرم (فارسی)",
    "description": "Form description",
    "version": 1,
    "sections": [
      {
        "code": "section_code",
        "name": "Section Name",
        "name_fa": "نام بخش",
        "description": "",
        "order": 1,
        "fields": [
          {
            "code": "field_code",
            "name": "Field Name",
            "name_fa": "نام فیلد",
            "field_type": "TEXT",
            "is_required": false,
            "placeholder": "",
            "help_text": "",
            "default_value": "",
            "order": 0,
            "options": [
              {"value": "val1", "label_fa": "برچسب ۱"}
            ]
          }
        ]
      }
    ]
  }
]
```

**Key Points:**
- Form number is extracted from `code` (e.g., "FORM_1" → form_number=1)
- Supports Persian labels in `name_fa` fields
- Field options are stored in `options_json`
- Sections and fields maintain their order

**Import Command:**
```bash
docker compose exec backend python manage.py import_forms_schema /app/forms.json --clear
```

**Successfully Imported:**
- ✅ Form 1: 4 sections, 21 fields
- ✅ Form 2: 4 sections, 16 fields
- ✅ Form 3: 4 sections, 26 fields
- ✅ Total: 63 fields across 12 sections
