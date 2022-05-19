DEL /Q /S "intermediate\thunderstore"
DEL /Q /S "build\thunderstore"
xcopy /s/e "packages/thunderstore" "intermediate/thunderstore/*" /Y
xcopy /s/e "lib/config" "intermediate/thunderstore/config/*" /Y
cd intermediate/thunderstore
7z a ../../build/thunderstore/rexabyte.zip * -r > nul
cd ../..