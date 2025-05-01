import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // Increase page load timeout (default is 60000)
    pageLoadTimeout: 120000, 
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
