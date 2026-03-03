'''import pandas as pd

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

# Separate features and target
X = df.drop(['asrs1_total.y', 'ADHD_label'], axis=1)
y = df['ADHD_label']

print("\nFeature Shape:", X.shape)
print("Target Shape:", y.shape)
# Keep only numeric columns
X = X.select_dtypes(include=['int64', 'float64'])

print("\nAfter Keeping Only Numeric Features:")
print(X.shape)

from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("\nTraining Data Shape:", X_train.shape)
print("Testing Data Shape:", X_test.shape)

from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

print("\nModel Trained Successfully")


from sklearn.metrics import accuracy_score

y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
print("\nModel Accuracy:", accuracy)

import joblib

joblib.dump(model, "models/adhd_model.pkl")

print("\nModel Saved Successfully")

'''

import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


# =========================
# 1️⃣ Load Dataset
# =========================

df = pd.read_csv("data/adhd.csv", encoding="latin1")

print("Dataset Loaded Successfully")
print("Initial Shape:", df.shape)


# =========================
# 2️⃣ Remove Unnamed Columns
# =========================

df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
print("After Removing Unnamed Columns:", df.shape)


# =========================
# 3️⃣ Remove Missing Target
# =========================

df = df.dropna(subset=['asrs1_total.y'])
print("After Removing Missing Target:", df.shape)


# =========================
# 4️⃣ Create Binary ADHD Label
# =========================

df['ADHD_label'] = df['asrs1_total.y'].apply(lambda x: 1 if x >= 24 else 0)

print("\nADHD Label Distribution:")
print(df['ADHD_label'].value_counts())


# =========================
# 5️⃣ Remove Leakage Columns
# =========================
# VERY IMPORTANT: Remove score totals and target-related columns

X = df.drop([
    'asrs1_total.y',
    'ADHD_label',
    'bai1_total',
    'aas_change'
], axis=1)

y = df['ADHD_label']


# =========================
# 6️⃣ Keep Only Numeric Features
# =========================

X = X.select_dtypes(include=['int64', 'float64'])
print("\nFinal Feature Shape:", X.shape)
print("Target Shape:", y.shape)


# =========================
# 7️⃣ Train Test Split
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Training Shape:", X_train.shape)
print("Testing Shape:", X_test.shape)


# =========================
# 8️⃣ Train Random Forest
# =========================

model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

print("\nModel Trained Successfully")


# =========================
# 9️⃣ Evaluate Model
# =========================

y_pred = model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
print("\nModel Accuracy:", accuracy)

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

#  Feature Importance
import matplotlib.pyplot as plt


importances = model.feature_importances_
feature_names = X.columns

feat_imp = pd.Series(importances, index=feature_names)
feat_imp.sort_values(ascending=False).head(10).plot(kind='bar')
plt.title("Top 10 Important Features")
plt.show()

# 🔥 Cross Validation
from sklearn.model_selection import cross_val_score

scores = cross_val_score(model, X, y, cv=5)
print("Cross Validation Accuracy:", scores.mean())

# =========================
# 🔟 Save Model
# =========================

joblib.dump(model, "models/adhd_model.pkl")
print("\nModel Saved Successfully")

