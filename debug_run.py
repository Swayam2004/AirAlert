import traceback
import run_fixed
try:
    run_fixed.main()
except Exception as e:
    traceback.print_exc()
