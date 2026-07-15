import re

lines = open('schema.prisma', 'r', encoding='utf-8').read().splitlines()

new_lines = []
current_model = None
model_lines = []

for line in lines:
    m = re.match(r'^model\s+(\w+)\s+\{', line)
    if m:
        current_model = m.group(1)
        model_lines = [line]
        continue
    
    if current_model:
        if line.strip() == '}':
            model_lines.append(line)
            # unique model_lines keeping order
            seen = set()
            for ml in model_lines:
                sml = ml.strip()
                if sml == '' or sml not in seen:
                    new_lines.append(ml)
                    if sml != '' and not sml.startswith('//'):
                        seen.add(sml)
            current_model = None
            model_lines = []
        else:
            model_lines.append(line)
    else:
        new_lines.append(line)

with open('schema.prisma', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("Duplicates removed successfully!")
