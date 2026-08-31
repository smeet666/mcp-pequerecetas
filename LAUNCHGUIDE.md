# mcp-pequerecetas

Read recipes from Pequerecetas in an MCP client. No API key, no account,
read-only.

## What it does

Five tools:

- **`get_recipe`**: read one recipe, rescaled to any number of people on request.
- **`search_recipes`**: find recipes by dish or ingredient, in Spanish.
- **`list_facets`**: the values each of the eight taxonomies publishes.
- **`browse_recipes`**: one taxonomy's recipes, page by page.
- **`scale_ingredients`**: rescale any Spanish ingredient list, offline.

## What sets it apart

Pequerecetas files a recipe by the appliance it is cooked in and by the age of
whoever eats it, from six months up. Those two axes browse a family kitchen the
way a family actually asks: what can go in the air fryer, what a nine-month-old
can eat.

The site serves recipes and articles that merely gather recipes at the same kind
of address, and describes both with the same machine-readable type. This server
tells them apart and says which came back, so a collection is never offered as a
dish to cook. It also reads the two thirds of recipes that keep their
ingredients in the body of the article rather than in that block, and says which
reading answered.

Rescaling marks every line: exact, rounded to a measurable amount, or left alone
for want of a quantity. Half an egg is not an amount, so a count lands on a whole
one and says so. Units stay in the system the recipe used. The site writes
equipment among the ingredients, and a line naming a tool is marked and carried
as published however many people the recipe is scaled to.

A time the site publishes no value for comes back as `null`. Searches and
listings come with no total, because the site prints none.

## Install

```bash
npx mcp-pequerecetas
```

Or in an MCP client's configuration:

```json
{
  "mcpServers": {
    "pequerecetas": {
      "command": "npx",
      "args": ["-y", "mcp-pequerecetas"]
    }
  }
}
```

## Links

- Source: https://github.com/smeet666/mcp-pequerecetas
- Package: https://www.npmjs.com/package/mcp-pequerecetas
- Licence: MIT
