@echo off
REM Build APK usando JDK 17. Si falla, usa Android Studio: File - Open android - Build - Build APK

set "JBR="
if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" set "JBR=C:\Program Files\Android\Android Studio\jbr"
if exist "C:\Program Files\Android\Android Studio\jre\bin\java.exe" set "JBR=C:\Program Files\Android\Android Studio\jre"
if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" set "JBR=%LOCALAPPDATA%\Programs\Android Studio\jbr"

if defined JBR (
  echo Usando JDK de Android Studio: %JBR%
  set "JAVA_HOME=%JBR%"
)

call gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 (
  echo.
  echo Si sigue fallando: abre la carpeta "android" en Android Studio y usa Build - Build Bundle^/APK^/s - Build APK^/s^).
  exit /b 1
)
echo.
echo APK generado en: app\build\outputs\apk\debug\app-debug.apk
exit /b 0
