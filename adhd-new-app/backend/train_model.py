import pandas as pd
import numpy as np
import joblib
import shap
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

# =========================
# 1️⃣ Load & Clean Dataset
# =========================
df = pd.read_csv("data/adhd.csv", encoding="latin1")
df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
df = df.dropna(subset=['asrs1_total.y'])

# Create label (Target)
df['ADHD_label'] = df['asrs1_total.y'].apply(lambda x: 1 if x >= 24 else 0)

# 🛑 LEAKAGE FIX
leakage_cols = ['asrs1_total.y', 'ADHD_label', 'bai1_total', 'aas_change']
X = df.drop(leakage_cols, axis=1)
y = df['ADHD_label']

# Keep only numeric and handle Missing Values
X = X.select_dtypes(include=['int64', 'float64'])
imputer = SimpleImputer(strategy='median')
X_imputed = pd.DataFrame(imputer.fit_transform(X), columns=X.columns)

# Scale numeric features
scaler = StandardScaler()
X_scaled = pd.DataFrame(scaler.fit_transform(X_imputed), columns=X_imputed.columns)

# =========================
# 2️⃣ Train-Test Split
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)

# =========================
# 3️⃣ Hyperparameter Tuning
# =========================
print("⚙️ Tuning Random Forest...")
param_grid = {
    'n_estimators': [100, 200],
    'max_depth': [None, 10, 20],
    'min_samples_split': [2, 5],
    'class_weight': ['balanced']
}

grid = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=5, scoring='accuracy')
grid.fit(X_train, y_train)
best_model = grid.best_estimator_

# =========================
# 4️⃣ Feature Selection
# =========================
importances = best_model.feature_importances_
feat_imp = pd.Series(importances, index=X_train.columns).sort_values(ascending=False)
top_features = feat_imp.head(15).index

X_train_final = X_train[top_features]
X_test_final = X_test[top_features]

# Retrain on best features
best_model.fit(X_train_final, y_train)

# =========================
# 5️⃣ Evaluation & SHAP
# =========================
y_pred = best_model.predict(X_test_final)
print(f"\n✅ Final Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print("\nClassification Report:\n", classification_report(y_test, y_pred))
print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))

# SHAP Explanations
print("\n🧠 Generating SHAP Visuals...")
explainer = shap.TreeExplainer(best_model)
shap_values = explainer.shap_values(X_test_final)

if isinstance(shap_values, list):
    shap.summary_plot(shap_values[1], X_test_final, show=False)
else:
    shap.summary_plot(shap_values, X_test_final, show=False)

plt.savefig("models/shap_summary.png")

# =========================
# 6️⃣ Save Everything
# =========================
joblib.dump(best_model, "models/adhd_model_final.pkl")
joblib.dump(top_features.tolist(), "models/features.pkl")
joblib.dump(scaler, "models/scaler.pkl")
joblib.dump(imputer, "models/imputer.pkl")

print("\n🚀 Model, Features, Scaler, and Imputer Saved Successfully!")

'''
version 2
import pandas as pd
import numpy as np
import joblib
import shap
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer

# =========================
# 1️⃣ Load & Clean Dataset
# =========================
df = pd.read_csv("data/adhd.csv", encoding="latin1")
df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
df = df.dropna(subset=['asrs1_total.y'])

# Create label (Target)
df['ADHD_label'] = df['asrs1_total.y'].apply(lambda x: 1 if x >= 24 else 0)

# 🛑 LEAKAGE FIX: In columns ko list mein dalen jo target se related hain
leakage_cols = ['asrs1_total.y', 'ADHD_label', 'bai1_total', 'aas_change'] 
# Agar ASRS ke individual sawal (Q1, Q2...) hain, unhein bhi yahan add karen.

X = df.drop(leakage_cols, axis=1)
y = df['ADHD_label']

# Keep only numeric and handle Missing Values
X = X.select_dtypes(include=['int64', 'float64'])
imputer = SimpleImputer(strategy='median') # Median is safer than mean
X_imputed = pd.DataFrame(imputer.fit_transform(X), columns=X.columns)

# =========================
# 2️⃣ Train-Test Split
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X_imputed, y, test_size=0.2, random_state=42, stratify=y
)

# =========================
# 3️⃣ Hyperparameter Tuning
# =========================
print("⚙️ Tuning Random Forest (Wait for 1-2 mins)...")
param_grid = {
    'n_estimators': [100, 200],
    'max_depth': [None, 10, 20],
    'min_samples_split': [2, 5],
    'class_weight': ['balanced'] # Handles imbalance
}

grid = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=5, scoring='accuracy')
grid.fit(X_train, y_train)
best_model = grid.best_estimator_

# =========================
# 4️⃣ Feature Selection (FIXED: Done on X_train only)
# =========================
importances = best_model.feature_importances_
feat_imp = pd.Series(importances, index=X.columns).sort_values(ascending=False)
top_features = feat_imp.head(15).index # Using top 15 for stability

X_train_final = X_train[top_features]
X_test_final = X_test[top_features]

# Retrain on best features
best_model.fit(X_train_final, y_train)

# =========================
# 5️⃣ Evaluation & SHAP
# =========================
y_pred = best_model.predict(X_test_final)
print(f"\n✅ Final Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))

# SHAP Explanations
print("\n🧠 Generating SHAP Visuals...")
explainer = shap.TreeExplainer(best_model)
shap_values = explainer.shap_values(X_test_final)

# Handle SHAP version differences
if isinstance(shap_values, list):
    shap.summary_plot(shap_values[1], X_test_final)
else:
    shap.summary_plot(shap_values, X_test_final)

# =========================
# 6️⃣ Save Everything
# =========================
joblib.dump(best_model, "models/adhd_model_final.pkl")
joblib.dump(top_features.tolist(), "models/features.pkl")
print("\n🚀 Model and Features Saved Successfully!")
'''


'''
version1
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
'''



