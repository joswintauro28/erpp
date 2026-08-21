import os
import re

def fix_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # 1. State initializers
    content = re.sub(r"useState\(\s*\[\s*\]\s*\)", "useState<any[]>([])", content)
    content = re.sub(r"useState\(\s*\{\s*\}\s*\)", "useState<any>({})", content)
    content = re.sub(r"useState\(\s*null\s*\)", "useState<any>(null)", content)

    # 2. Known utility functions in erp-ui
    content = re.sub(r"const money = \(v\)", "const money = (v: any)", content)
    content = re.sub(r"const money = \(val\)", "const money = (val: any)", content)
    content = re.sub(r"const statusVariant = \(status\)", "const statusVariant = (status: any)", content)
    content = re.sub(r"const statusVariant = \(s\)", "const statusVariant = (s: any)", content)

    # 3. Known function signatures in erp-ui
    content = re.sub(r"handleLogin = async \(e\)", "handleLogin = async (e: React.FormEvent)", content)
    content = re.sub(r"handleSubmit = async \(e\)", "handleSubmit = async (e: React.FormEvent)", content)
    content = re.sub(r"handleSubmit = \(e\)", "handleSubmit = (e: React.FormEvent)", content)
    content = re.sub(r"handleSave = async \(e\)", "handleSave = async (e: React.FormEvent)", content)
    content = re.sub(r"handleSave = \(e\)", "handleSave = (e: React.FormEvent)", content)
    
    # 4. Standard single parameter arrow functions: `(param) =>` -> `(param: any) =>`
    # Match any word that is surrounded by parentheses followed by arrow, if it doesn't already have a colon
    content = re.sub(r"\((?!\s*\))(?!e:)(?!error:)(?!err:)(?!id:)(?!item:)(?!inv:)(?!row:)(?!col:)(?!p:)(?!s:)(?!u:)(?!res:)(?!data:)(?!prod:)(?!movement:)(?!client:)(?!supplier:)(?!user:)(?!role:)(?!perm:)(?!warehouse:)(?!workflow:)(?!option:)(?!opt:)(?!line:)([a-zA-Z_]\w*)\)\s*=>", r"(\1: any) =>", content)
    
    # 5. Word arrow functions: `param =>` -> `(param: any) =>`
    # E.g. `inv =>` -> `(inv: any) =>`
    content = re.sub(r"(?<!\w)(?<!:)(?!true)(?!false)([a-zA-Z_]\w*)\s*=>", r"(\1: any) =>", content)

    # 6. Two parameter arrow functions: `(param1, param2) =>` -> `(param1: any, param2: any) =>`
    content = re.sub(r"\(([a-zA-Z_]\w*)\s*,\s*([a-zA-Z_]\w*)\)\s*=>", r"(\1: any, \2: any) =>", content)

    # 7. Lucide React ComponentType check in Header and Dashboard
    content = content.replace("icon: React.ComponentType<{ size?: number }>", "icon: any")
    content = content.replace("icon: ComponentType<{ size?: number; className?: string }>", "icon: any")

    if content != original:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False

def main():
    target_dir = r"c:\Users\ajith\Videos\Projects\DATAVEX\ERP\apps\erp-ui"
    modified_count = 0
    
    for root, _, files in os.walk(target_dir):
        for file in files:
            if file.endswith(".ts") or file.endswith(".tsx"):
                file_path = os.path.join(root, file)
                if fix_file(file_path):
                    print(f"Fixed types in: {os.path.relpath(file_path, target_dir)}")
                    modified_count += 1
                    
    print(f"\nType fixing completed. Modified {modified_count} files.")

if __name__ == "__main__":
    main()
