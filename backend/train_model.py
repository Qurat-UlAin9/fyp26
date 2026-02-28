import pandas as pd

df = pd.read_csv("data/adhd.csv", encoding="latin1")

print("Dataset Loaded Successfully")
print(df.head())
print("\nDataset Info:")
print(df.info())
# Remove empty unnamed columns
df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

print("\nAfter Removing Unnamed Columns:")
print(df.shape)
print("\nDataset Info:")
print(df.info())

print("\nColumn Names:")
print(df.columns)

print("\nChecking possible label columns:")

print("\nasrs1_total.y unique values:")
print(df['asrs1_total.y'].unique())

print("\naas_change unique values:")
print(df['aas_change'].unique())


# Remove rows where target is missing
df = df.dropna(subset=['asrs1_total.y'])

# Create binary ADHD label
df['ADHD_label'] = df['asrs1_total.y'].apply(lambda x: 1 if x >= 24 else 0)

print("\nNew ADHD Label Created")
print(df['ADHD_label'].value_counts())

print("Shape after removing missing target:", df.shape)