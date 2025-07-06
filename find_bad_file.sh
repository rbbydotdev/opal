#!/bin/bash

# Configuration
GOOD_COMMIT="HEAD~1" # Replace with your actual good commit hash (e.g., 'abcdef0')
BAD_COMMIT="HEAD"    # Replace with your actual bad commit hash (e.g., '1234567')
TEST_COMMAND="npm run build && echo 'Build complete. Run your tests manually or check the output.' && echo 'Press Enter to continue...' && read" # Command to test your code. Adjust as needed.
# For a more robust test, make sure TEST_COMMAND exits with 0 on success and non-zero on failure.
# Example: TEST_COMMAND="npm test" (if npm test exits with 0 on success)

# --- Check for whiptail or dialog (optional, for better UI) ---
if command -v whiptail &>/dev/null; then
    DIALOG_CMD="whiptail"
    DIALOG_OPTS="--checklist --separate-output --title 'Select Files to Toggle' --ok-button 'Apply & Test' --cancel-button 'Exit' 20 78 15"
elif command -v dialog &>/dev/null; then
    DIALOG_CMD="dialog"
    DIALOG_OPTS="--checklist 'Select Files to Toggle' 20 78 15"
else
    echo "Warning: Neither 'whiptail' nor 'dialog' found. Falling back to simpler menu."
    DIALOG_CMD="none"
fi

# --- Main Script ---

echo "Starting bad file search..."
echo "Good Commit: $GOOD_COMMIT"
echo "Bad Commit (Code Mod): $BAD_COMMIT"
echo "Current Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "--------------------------------------------------"

# Ensure we're on a clean state (optional: stash current uncommitted changes)
if [[ $(git status --porcelain) ]]; then
    echo "Warning: You have uncommitted changes. Stashing them now."
    git stash push -m "find_bad_file.sh temporary stash"
    STASHED=true
fi

# Store the original branch to return to later
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Get list of changed files between GOOD_COMMIT and BAD_COMMIT
# Using --name-only to get just the file paths
CHANGED_FILES=$(git diff --name-only "$GOOD_COMMIT" "$BAD_COMMIT")

if [ -z "$CHANGED_FILES" ]; then
    echo "No files changed between $GOOD_COMMIT and $BAD_COMMIT. Exiting."
    exit 0
fi

# Initialize array to keep track of current file states (checked out from BAD_COMMIT or GOOD_COMMIT)
declare -A FILE_STATE # Associative array: key=file_path, value=1 (bad) or 0 (good)
INITIAL_STATE=0 # Start with all files in 'good' state by default (from GOOD_COMMIT)

# Initialize all files to their GOOD_COMMIT state
echo "Checking out all files from $GOOD_COMMIT..."
git checkout "$GOOD_COMMIT" -- . # Checkout all files from the good commit
for file in $CHANGED_FILES; do
    FILE_STATE["$file"]=$INITIAL_STATE # Mark all as 'good'
done
echo "Ready to begin. All files currently reflect $GOOD_COMMIT state."

# Function to run the test command
run_test() {
    echo ""
    echo "--- Running Test ---"
    eval "$TEST_COMMAND"
    echo "--- Test Complete ---"
    echo ""
}

# Main loop for interactive selection
while true; do
    MENU_ITEMS=()
    COUNTER=1
    for file in $CHANGED_FILES; do
        # For whiptail/dialog, format: "tag item status"
        # tag: arbitrary string, item: description, status: ON/OFF
        STATUS="OFF" # Default to 'OFF' for whiptail/dialog (means unchecked)
        if [ "${FILE_STATE[$file]}" -eq 1 ]; then
            STATUS="ON" # 'ON' means checked (file is from BAD_COMMIT)
        fi
        MENU_ITEMS+=("$file" "$file" "$STATUS")
    done

    SELECTED_FILES=""

    if [ "$DIALOG_CMD" == "whiptail" ]; then
        SELECTED_FILES=$(whiptail "${MENU_ITEMS[@]}" $DIALOG_OPTS 3>&1 1>&2 2>&3)
        EXIT_STATUS=$?
    elif [ "$DIALOG_CMD" == "dialog" ]; then
        # Dialog needs output redirected differently
        exec 3>&1
        SELECTED_FILES=$(dialog "${MENU_ITEMS[@]}" $DIALOG_OPTS 2>&1 1>&3)
        EXIT_STATUS=$?
        exec 3>&-
    else
        # Fallback to simple select loop if no dialog/whiptail
        echo ""
        echo "Current File States:"
        for file in $CHANGED_FILES; do
            CURRENT_STATUS="GOOD_COMMIT"
            if [ "${FILE_STATE[$file]}" -eq 1 ]; then
                CURRENT_STATUS="BAD_COMMIT"
            fi
            echo "  [${COUNTER}] $file ($CURRENT_STATUS)"
            ((COUNTER++))
        done
        echo ""
        echo "Enter numbers of files to TOGGLE their state (e.g., '1 3 5'), or 't' to test, 'q' to quit:"
        read -r INPUT
        case "$INPUT" in
            [Qq]*)
                EXIT_STATUS=1 # Treat as cancel
                ;;
            [Tt]*)
                run_test
                continue
                ;;
            *)
                # Process selected numbers
                for num in $INPUT; do
                    if [[ "$num" =~ ^[0-9]+$ ]] && (( num > 0 )) && (( num <= ${#CHANGED_FILES[@]} )); then
                        file_to_toggle=$(echo "$CHANGED_FILES" | sed -n "${num}p")
                        # Simulate whiptail output for processing
                        SELECTED_FILES+="$file_to_toggle "
                    else
                        echo "Invalid input: $num"
                    fi
                done
                EXIT_STATUS=0 # Treat as OK
                ;;
        esac
    fi


    if [ "$EXIT_STATUS" -ne 0 ]; then
        echo "Exiting."
        break # User canceled or quit
    fi

    echo "Applying selected file states..."
    NEW_FILE_STATE=()
    for item in $CHANGED_FILES; do
        found=false
        for selected in $SELECTED_FILES; do
            if [ "$item" == "$selected" ]; then
                found=true
                break
            fi
        done

        if $found; then
            NEW_FILE_STATE["$item"]=1 # Mark as 'bad' (from BAD_COMMIT)
        else
            NEW_FILE_STATE["$item"]=0 # Mark as 'good' (from GOOD_COMMIT)
        fi
    done

    # Apply changes based on NEW_FILE_STATE compared to FILE_STATE
    for file in $CHANGED_FILES; do
        if [ "${NEW_FILE_STATE[$file]}" -eq 1 ] && [ "${FILE_STATE[$file]}" -eq 0 ]; then
            # File was good, now toggle to bad
            echo "  Applying changes from $BAD_COMMIT for: $file"
            git checkout "$BAD_COMMIT" -- "$file"
            FILE_STATE["$file"]=1
        elif [ "${NEW_FILE_STATE[$file]}" -eq 0 ] && [ "${FILE_STATE[$file]}" -eq 1 ]; then
            # File was bad, now toggle to good
            echo "  Reverting changes to $GOOD_COMMIT for: $file"
            git checkout "$GOOD_COMMIT" -- "$file"
            FILE_STATE["$file"]=0
        fi
    done

    run_test
    echo "Files currently sourced from BAD_COMMIT:"
    for file in $CHANGED_FILES; do
        if [ "${FILE_STATE[$file]}" -eq 1 ]; then
            echo " - $file"
        fi
    done
    echo "--------------------------------------------------"

done

# --- Cleanup ---
echo "Cleaning up..."

# Revert all changes in the working directory to the original branch's state
git checkout "$ORIGINAL_BRANCH"

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo "Restoring stashed changes..."
    git stash pop
fi

echo "Script finished. Your working directory has been restored to '$ORIGINAL_BRANCH'."
echo "The problematic file(s) should be among those that, when switched from 'GOOD' to 'BAD', introduced the error."