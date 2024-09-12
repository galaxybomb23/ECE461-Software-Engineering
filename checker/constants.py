import os

## =================== UPDATE THESE VALUES =================== ##
# Env variables
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
LOG_FILE = os.environ.get("LOG_FILE", "/tmp/log.log")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Repository location
REPO_PATH = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))



## =================== DO NOT MODIFY BELOW THIS LINE =================== ##
# constants
ONE_URL = "checker/one-url.txt"

# JSON Fields
FIELDS = [
    "URL",
]

SCORE_FIELDS = [
    "NetScore",
    "RampUp",
    "Correctness",
    "BusFactor",
    "ResponsiveMaintainer",
    "License"
]

LATENCY_FIELDS = [ f"{s}_Latency" for s in SCORE_FIELDS ]
ALL_FIELDS = FIELDS + SCORE_FIELDS + LATENCY_FIELDS

# printing Colors
ESC="\033"
RED=ESC+"[91m"
GREEN=ESC+"[92m"
YELLOW=ESC+"[93m"
BLUE=ESC+"[94m"
RESET=ESC+"[0m"
BOLD=ESC+"[1m"
