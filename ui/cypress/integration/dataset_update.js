
/**
 *
 **/
function mockHttpRequests() {

  cy.intercept({
    method: 'GET',
    url: '/api/data_annotation/*/domains*'
  }, {
    fixture: 'domains_get.json'
  });

  cy.intercept({
    method: 'POST',
    url: '/api/data_annotation/datasets'
  }, {
    fixture: 'datasets_post.json'
  });

  cy.intercept({
    method: 'POST',
    url: '/api/data_annotation/datasets/*/upload*'
  }, {
    "id": "test-guid",
    "filename": "raw_data.csv"
  });

  cy.intercept({
    method: 'PATCH',
    url: '/api/data_annotation/datasets/*/annotations'
  }, "Updated annotation with id = test-guid");

  cy.intercept({
    method: 'GET',
    url: '/api/data_annotation/datasets/*/annotations*'
  }, { fixture: 'datasets_annotations_get_prepopulated.json' }).as('DatasetAnnotationsGETStub');

  cy.intercept({
    method: 'POST',
    url: '/api/data_annotation/datasets/*/preview/raw*'
  }, { fixture: 'datasets_preview_raw_post.json' });

  cy.intercept({
    method: 'POST',
    url: '/api/data_annotation/datasets/*/preview/processed*'
  }, { fixture: 'datasets_preview_processed_post.json' });

  // This is done to add mixmasta/jobs results to datasetInfo
  // TODO, should we change to PATCH, to simplify available stepper/flows?
  // PUT will reset some values.
  cy.intercept(
    'PUT',
    '/api/data_annotation/datasets',
    {});

  cy.intercept(
    'PATCH',
    '/api/data_annotation/datasets*',
    {});

  cy.intercept({
    method: 'PUT',
    url: '/api/data_annotation/datasets/*/publish*'
  }, {});

  cy.intercept({
    url: '/api/data_annotation/datasets/*/verbose*',
    method: 'GET'
  }, { fixture: 'datasets_verbose_get.json' }).as('DatasetsVerboseGETStub');

  cy.intercept({
    url: '/api/data_annotation/datasets/validate_date*',
    method: 'POST'
  }, { "format": "%Y-%m-%d", "valid": true }).as('ValidateFormatStub');

}

describe('Dataset Update Metadata Flow', function () {

  beforeEach(() => {
    cy.intercept(
      '/api/**/*',
      { middleware: true },
      (req) => {
        req.on('before:response', (res) => {
          // force all API responses to not be cached during testing! Ugh
          res.headers['cache-control'] = 'no-store';
        });
      }
    );
  });

  it('Happy path: Goes through from Update Metadata flow until success page with mocked requests', function () {

    mockHttpRequests();

    cy.visit('/datasets/update/register/test-guid');

    cy
      .findByRole('textbox', { name: /^Name/i })
      .as('DatasetName')
      .should('have.value', 'A better name');

    cy
      .findByRole('textbox', { name: /^Description/i })
      .as('DatasetDescription')
      .should('have.value', 'A description, yo!');

    cy
      .get('@DatasetName')
      .clear()
      .type('An updated name');

    cy
      .get('@DatasetDescription')
      .clear()
      .type('An updated description');

    cy.findByText(/^output_0.9_1.2.csv/)
      .should('exist');

    // Submit / navigate to next
    cy.findByRole('button', { name: /^next/i }).click();

    cy.wait(10);

    cy.url().should('match', /datasets\/update\/annotate\/.+\?filename=raw_data.csv/);

    // Annotate page actions

    // ====== Annotate the date column ==============
    cy.findByText('date').click();

    cy.findAllByRole('button', { name: /^type/i })
      .should('have.class', 'Mui-disabled');

    cy.findByRole('checkbox', { name: /This is my primary date field This is my primary date field/i })
      .should('be.disabled');

    cy.findByRole('textbox', { name: /Description/i })
      .clear()
      .type('A new editable description');

    cy.findByRole('button', { name: /^save/i })
      .click();

    // ========== Annotate the value column as feature =============

    cy.findByText('color_hue').as('ColorColumnLabel');

    cy
      .get('@ColorColumnLabel')
      .siblings('div')
      .findByText('inferred')
      .should('not.exist');

    cy.get('@ColorColumnLabel')
      .click();

    cy.findAllByRole('button', { name: /type/i })
      .should('have.class', 'Mui-disabled');

    cy.findAllByRole('textbox', { name: /^Description/i })
      .type(' sample column description for a feature');

    cy.findByRole('textbox', { name: /^units/i })
      .type('mmmm');

    cy.findAllByRole('button', { name: /clear/i })
      .should('be.disabled');

    cy.findAllByRole('button', { name: /save/i }).click();

    // READY TO SUBMIT ANNOTATE step

    cy.findAllByRole('button', { name: /^Next$/i }).click();

    cy.url().should('not.match', /datasets\/update\/process\/.+\?filename=raw_data.csv/);

    cy.url().should('match', /datasets\/update\/preview\/.+\?filename=raw_data.csv/);

    cy.findAllByRole('button', { name: /^submit$/i, timeout: 1000 }).click();

    // ASSERTIONS

    cy.url().should('match', /datasets\/update\/submit\/.+\?filename=raw_data.csv/);

    cy.findByText(/Your dataset has been successfully registered/i).should('exist');

  });

});
