describe('Smoke Test', () => {
  it('should load the home page', () => {
    // Start from the index page
    cy.visit('http://localhost:3000/');

    // Find the main heading or a known element on the home page
    // Adjust the selector if needed based on the actual home page structure
    cy.get('h1').contains(/Plank You Very Much|Dashboard/i).should('exist'); // Example: Check for main heading
  });
});