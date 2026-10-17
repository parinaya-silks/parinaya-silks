"""Compatibility entry point; public simulations were retired.
Pricing/fulfilment fixture coverage remains in the unit suite.
"""
import runpy
runpy.run_path("scripts/storefront-browser.test.py", run_name="__main__")
