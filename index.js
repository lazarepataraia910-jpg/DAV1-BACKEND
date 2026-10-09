import fetch from "node-fetch";
import moment from "moment";
import fs from "fs/promises";

const RECIPES_URL = "https://dummyjson.com/recipes?limit=0";
const USERS_URL = "https://dummyjson.com/users?limit=0";

async function getData(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function writeJson(fileName, data) {
  await fs.writeFile(fileName, JSON.stringify(data, null, 2));
  console.log(`✔ ${fileName} saved`);
}

// 1) Recipes
async function getRecipes() {
  const data = await getData(RECIPES_URL);

  const recipes = data.recipes.map((recipe) => ({
    name: recipe.name,
    ingredients: recipe.ingredients,
    prepTimeMinutes: recipe.prepTimeMinutes,
    rating: recipe.rating,
  }));

  await writeJson("recipes.json", recipes);
  return recipes;
}

// 2) Users
async function getUsers() {
  const data = await getData(USERS_URL);

  const users = data.users.map((user) => ({
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    birthDate: moment(user.birthDate, "YYYY-M-D").format("DD MMMM YYYY"),
    country: user.address.country,
  }));

  await writeJson("users.json", users);
  return users;
}

// 3) Extra: statistics
async function createStats(recipes, users) {
  const topRecipes = [...recipes]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map((r) => ({ name: r.name, rating: r.rating }));

  const quickRecipes = recipes
    .filter((r) => r.prepTimeMinutes <= 15)
    .map((r) => ({ name: r.name, prepTimeMinutes: r.prepTimeMinutes }));

  const averageRating =
    recipes.reduce((sum, r) => sum + r.rating, 0) / recipes.length;

  const ages = users.map((u) =>
    moment().diff(moment(u.birthDate, "DD MMMM YYYY"), "years")
  );

  const usersByCountry = users.reduce((acc, u) => {
    acc[u.country] = (acc[u.country] || 0) + 1;
    return acc;
  }, {});

  const stats = {
    generatedAt: moment().format("DD/MM/YYYY HH:mm:ss"),
    recipes: {
      total: recipes.length,
      averageRating: Number(averageRating.toFixed(2)),
      top5ByRating: topRecipes,
      quickRecipes,
    },
    users: {
      total: users.length,
      averageAge: Math.round(ages.reduce((a, b) => a + b, 0) / ages.length),
      youngest: Math.min(...ages),
      oldest: Math.max(...ages),
      byCountry: usersByCountry,
    },
  };

  await writeJson("stats.json", stats);
}

async function main() {
  try {
    const [recipes, users] = await Promise.all([getRecipes(), getUsers()]);
    await createStats(recipes, users);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
