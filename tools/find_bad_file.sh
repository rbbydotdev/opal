#!/bin/bash

# This script checks out files listed in files_to_check.txt one by one.
# It prompts the user to press Enter to continue to the next file or 'q' to quit.
# this was used to find offending file for max depth recursion after doing remove use memo and use callbackc odemod
# Get the total number of lines in files_to_check.txt
total_lines=$(wc -l <files_to_check.txt)

# Start a counter for the current line
current_line=1

# Loop indefinitely
while true; do
  # Check if we've gone through all lines
  if [ "$current_line" -gt "$total_lines" ]; then
    echo "All files have been checked out."
    break
  fi

  # Get the Nth file from files_to_check.txt
  file_to_checkout=$(sed -n "${current_line}p" files_to_check.txt)

  echo "Checking out: $file_to_checkout (file $current_line of $total_lines)"

  # Execute the git checkout command
  git checkout codemod -- "$file_to_checkout"

  # Increment the line counter
  current_line=$((current_line + 1))

  # Prompt user to hit enter for the next checkout, or 'q' to quit
  read -p "Press Enter to checkout the next file, or 'q' to quit: " user_input
  if [[ "$user_input" == "q" || "$user_input" == "Q" ]]; then
    echo "Exiting."
    break
  fi
done
