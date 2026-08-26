@echo off
setlocal
if not exist gaia_dr3_mini.hdf5 (
  echo Put gaia_dr3_mini.hdf5 beside this file first.
  pause
  exit /b 1
)
python tools\build_gaia_regional.py gaia_dr3_mini.hdf5 data\milkyway --limit 100000 --mag-limit 22 --quota-per-cell 100
if errorlevel 1 pause & exit /b 1
echo Gaia binary created in data\milkyway\
pause
