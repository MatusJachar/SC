# ✅ SPRÁVNY POSTUP PRE KAŽDÝ BUILD

## Poradie krokov (NIKDY nevynechaj!):

```powershell
cd C:\Users\User1\Desktop\SC\frontend

# 1. GIT PUSH - vždy ako prvé!
git add -A
git commit -m "popis zmien"
git push origin main

# 2. VYMAZAŤ node_modules
cmd /c "rmdir /s /q node_modules"

# 3. REINSTALL
npm install

# 4. BUILD
eas build --platform android --profile preview
```

## Prečo toto poradie:
1. Git push PRVÝ → zmeny sú v bezpečí na GitHub
2. node_modules VYMAZAŤ → archív bude ~50MB nie 1.5GB  
3. npm install → stiahne čerstvé knižnice
4. eas build → upload bude trvať 30 sekúnd nie hodinu

## Skratka - jeden príkaz:
```powershell
git add -A && git commit -m "update" && git push origin main && cmd /c "rmdir /s /q node_modules" && npm install && eas build --platform android --profile preview
```
