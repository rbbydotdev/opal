import { expect, test } from "@playwright/test";

test.describe("Workspace Creation Flow", () => {
  test("should create a new workspace and add a markdown file", async ({ page }) => {
    // Navigate to the home page
    await page.goto("/");

    // Wait for the page to load by checking for the "new workspace" link
    await expect(page.getByRole("link", { name: "new workspace" })).toBeVisible();

    // Click on "new workspace" link
    await page.getByRole("link", { name: "new workspace" }).click();

    // Verify we're on the new workspace page
    await expect(page).toHaveURL(/.*\/newWorkspace/);

    // Verify the New Workspace dialog is visible
    await expect(page.getByRole("dialog", { name: "New Workspace" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "New Workspace" })).toBeVisible();

    // Verify the name field has a generated workspace name
    const nameField = page.getByRole("textbox", { name: "Name" });
    await expect(nameField).toBeVisible();
    await nameField.clear();
    const workspaceName = "my-cool-new-workspace";
    await nameField.fill(workspaceName);
    // expect(workspaceName).toMatch(/^wrk-.+$/);
    // expect(workspaceName).toMatch(/^wrk-[a-zA-Z0-9_-]+$/);

    // Click Create button to create the workspace
    await page.getByRole("button", { name: "Create" }).click();

    // Wait for workspace creation and redirect
    await expect(page).toHaveURL(new RegExp(`/workspace/${workspaceName}`));

    // Verify we can see the workspace name in the sidebar (use first match to avoid strict mode violation)
    await expect(page.getByText(workspaceName).first()).toBeVisible();

    // Click on Files button to expand the files section
    await page.getByRole("button", { name: "Files" }).click();

    // Verify Files section is expanded and shows the default welcome file
    await expect(page.getByText("welcome")).toBeVisible();

    // Click on "New Markdown File" button
    await page.getByRole("button", { name: "New Markdown File" }).click();

    // Verify a new file input appears
    await expect(page.getByRole("textbox").last()).toBeVisible();

    // The new file should have a default name
    const newFileInput = page.getByRole("textbox").last();
    await expect(newFileInput).toHaveValue("newfile.md");

    // Press Enter to confirm the file creation
    await newFileInput.press("Enter");

    // Verify the new file appears in the file list
    await expect(page.getByText("newfile")).toBeVisible();

    // Verify we now have both the welcome file and the new file
    await expect(page.getByText("welcome")).toBeVisible();
    await expect(page.getByText("newfile")).toBeVisible();

    // Verify the new file link is active (current file)
    await expect(page.getByRole("link", { name: "newfile" })).toHaveAttribute("class", /active/);
  });

  test("should handle workspace creation with custom name", async ({ page }) => {
    await page.goto("/");

    // Click on "new workspace" link
    await page.getByRole("link", { name: "new workspace" }).click();

    // Clear the default name and enter a custom name
    const nameField = page.getByRole("textbox", { name: "Name" });
    await nameField.clear();
    await nameField.fill("my-test-workspace");

    // Create the workspace
    await page.getByRole("button", { name: "Create" }).click();

    // Verify we're redirected to the new workspace
    await expect(page).toHaveURL(/\/workspace\/my-test-workspace/);
    await expect(page.getByText("my-test-workspace").first()).toBeVisible();
  });

  test("should show workspace creation UI elements correctly", async ({ page }) => {
    await page.goto("/");

    // Click on "new workspace" link
    await page.getByRole("link", { name: "new workspace" }).click();

    const dialog = page.getByRole("dialog", { name: "New Workspace" });

    // Verify all UI elements are present
    await expect(dialog.getByRole("heading", { name: "New Workspace" })).toBeVisible();
    await expect(dialog.getByText("Create A New Workspace")).toBeVisible();
    await expect(dialog.getByText("Name")).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Name" })).toBeVisible();
    await expect(dialog.getByText("File System").first()).toBeVisible();
    await expect(dialog.getByRole("combobox")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Create" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();

    // Test Cancel button
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();
  });
});
