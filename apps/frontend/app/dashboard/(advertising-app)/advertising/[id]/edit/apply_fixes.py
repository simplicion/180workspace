import os
import re

file_path = r'C:\Users\saavi\OneDrive\Desktop\180workspace\apps\frontend\app\dashboard\(advertising-app)\advertising\[id]\edit\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update header responsiveness
content = content.replace(
    'className={`flex flex-col md:flex-row items-center',
    'className={`flex ${viewMode === \'mobile\' ? \'flex-col\' : viewMode === \'tablet\' ? \'flex-row\' : \'flex-col md:flex-row\'} items-center'
)

# 2. Update footer grid
content = content.replace(
    'className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left mb-8"',
    'className={`max-w-4xl mx-auto grid ${viewMode === \'mobile\' ? \'grid-cols-1\' : viewMode === \'tablet\' ? \'grid-cols-2\' : \'grid-cols-1 md:grid-cols-2 lg:grid-cols-3\'} gap-8 text-left mb-8`}'
)

# 3. Update FakeLeadForm padding (no viewMode here because it is out of scope)
content = content.replace(
    'className="space-y-5 bg-white p-8 md:p-10 rounded-[2.5rem]',
    'className="space-y-5 bg-white p-8 rounded-[2.5rem]'
)

# 4. Remove local getDefaultElementForType and getDefaultSectionsForPageType
# Use regex to remove everything from 'function getDefaultElementForType' up to the end of getDefaultSectionsForPageType
# We will just replace it with an empty string.
# We know the end is right before 'function FakeLeadForm'
pattern = re.compile(r'function getDefaultElementForType\(.*?function FakeLeadForm', re.DOTALL)
content = re.sub(pattern, 'function FakeLeadForm', content)

# 5. Update imports
content = content.replace(
    "import { getDefaultElementForType } from './ElementFactory';",
    "import { getDefaultElementForType, getDefaultSectionsForPageType } from './ElementFactory';"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated page.tsx successfully.")
