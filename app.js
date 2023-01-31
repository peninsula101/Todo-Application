const express = require("express");
const app = express();
app.use(express.json());

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const path = require("path");
const db_path = path.join(__dirname, "todoApplication.db");

var format = require("date-fns/format");
var isValid = require("date-fns/isValid");

let db = null;

const initializeDbAndServer = async () => {
  db = await open({ filename: db_path, driver: sqlite3.Database });
  app.listen(3000, () => {
    try {
      console.log("server running at http://localhost:3000");
    } catch (error) {
      console.log(`DB ERROR ${error.message}`);
      process.exit(1);
    }
  });
};
initializeDbAndServer();

const validationRequest = (request, response, next) => {
  const resObject = request.query;
  if (
    (resObject.status === undefined ||
      ["TO DO", "IN PROGRESS", "DONE"].includes(resObject.status)) === false
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    (resObject.priority === undefined ||
      ["HIGH", "MEDIUM", "LOW"].includes(resObject.priority)) === false
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    (resObject.category === undefined ||
      ["WORK", "HOME", "LEARNING"].includes(resObject.category)) === false
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (
    (resObject.date === undefined || isValid(new Date(resObject.date))) ===
    false
  ) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

const validationRequestBody = (request, response, next) => {
  const resObject = request.body;
  if (
    (resObject.status === undefined ||
      ["TO DO", "IN PROGRESS", "DONE"].includes(resObject.status)) === false
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    (resObject.priority === undefined ||
      ["HIGH", "MEDIUM", "LOW"].includes(resObject.priority)) === false
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    (resObject.category === undefined ||
      ["WORK", "HOME", "LEARNING"].includes(resObject.category)) === false
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (
    (resObject.dueDate === undefined ||
      isValid(new Date(resObject.dueDate))) === false
  ) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};
const convertDbObjectToCamelCaseObject = (object) => {
  return {
    id: object.id,
    todo: object.todo,
    priority: object.priority,
    status: object.status,
    category: object.category,
    dueDate: object.due_date,
  };
};

// get todo API

app.get("/todo/", async (request, response) => {
  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    ORDER BY
      id;`;
  const todosArray = await db.all(getTodoQuery);
  //response.send(todosArray);
  response.send(
    todosArray.map((eachTodo) => convertDbObjectToCamelCaseObject(eachTodo))
  );
});

//API 1 GET
app.get("/todos/", validationRequest, async (request, response) => {
  try {
    const {
      offset = 0,
      limit = 5,
      order = "ASC",
      order_by = "id",
      status = "",
      priority = "",
      search_q = "",
      category = "",
    } = request.query;
    const Query = `
    SELECT
        *
    FROM
        todo
    WHERE
        status LIKE '%${status}%' and
        priority LIKE '%${priority}%' and
        todo LIKE '%${search_q}%' and
        category LIKE '%${category}'
    ORDER BY ${order_by} ${order}
        LIMIT ${limit} OFFSET ${offset};`;
    const dbResponse = await db.all(Query);
    /*let results = [];
    for (let i = 0; i < dbResponse.length; i++) {
      let resObject = convertDbObjectToCamelCaseObject(dbResponse[i]);
      results.push(resObject);
    }
    response.send(results);*/
    response.send(
      dbResponse.map((eachTodo) => convertDbObjectToCamelCaseObject(eachTodo))
    );
  } catch (error) {
    console.log(`ERROR API ${error.message}`);
  }
});

// API 2 GET
app.get("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const Query = `
        SELECT
            *
        FROM
            todo
        WHERE
            Id=${todoId};`;
    let dbResponse = await db.get(Query);
    response.send(convertDbObjectToCamelCaseObject(dbResponse));
  } catch (error) {
    console.log(`ERROR API ${error.message}`);
  }
});

//API 3 GET
app.get("/agenda/", validationRequest, async (request, response) => {
  try {
    let { date = "" } = request.query;
    date = format(new Date(date), "yyyy-MM-dd");
    console.log(date);
    const Query = `
            SELECT
                *
            FROM
                todo
            WHERE
                due_date LIKE '%${date}%';`;
    const dbResponse = await db.all(Query);
    console.log(dbResponse);
    response.send(
      dbResponse.map((eachTodo) => convertDbObjectToCamelCaseObject(eachTodo))
    );
  } catch (error) {
    console.log(`ERROR API ${error.message}`);
  }
});

//API 4 POST
app.post("/todos/", validationRequestBody, async (request, response) => {
  try {
    const todoDetails = request.body;
    const { id, todo, priority, status, category, dueDate } = todoDetails;
    const checkTodo = `
    SELECT
        *
    FROM
        todo
    WHERE
        id=${id};`;
    const dbResponse = await db.all(checkTodo);

    if (dbResponse.length > 0) {
      response.send("todoId exists");
    } else {
      const date = format(new Date(dueDate), "yyyy-MM-dd");
      const Query = `
            INSERT INTO
                todo (id,todo, priority,status, category, due_date)
            VALUES
                (
                    ${id},
                    "${todo}",
                    "${priority}",
                    "${status}",
                    "${category}",
                    "${date}"
                );`;
      await db.run(Query);
      response.send("Todo Successfully Added");
    }
  } catch (error) {
    console.log(`ERROR API ${error.message}`);
  }
});

//API 5 PUT
app.put("/todos/:todoId/", validationRequestBody, async (request, response) => {
  try {
    const { todoId } = request.params;
    const todoDetails = request.body;
    console.log(todoDetails);
    let key = null;
    let value = null;
    function getQuery(key, value) {
      const Query = `
        UPDATE
            todo
        SET
            ${key}="${value}"
        WHERE
            id=${todoId};`;
      return Query;
    }
    if ("status" in todoDetails) {
      const { status } = todoDetails;
      key = "status";
      console.log(key);
      //value = status;
      value = todoDetails[key];
      console.log(value);
      Query = getQuery(key, value);
      await db.run(Query);
      response.send("Status Updated");
    }
    if ("priority" in todoDetails) {
      const { priority } = todoDetails;
      key = "priority";
      value = priority;
      Query = getQuery(key, value);
      await db.run(Query);
      response.send("Priority Updated");
    }
    if ("todo" in todoDetails) {
      const { todo } = todoDetails;
      key = "todo";
      value = todo;
      Query = getQuery(key, value);
      await db.run(Query);
      response.send("Todo Updated");
    }
    if ("category" in todoDetails) {
      const { category } = todoDetails;
      key = "category";
      value = category;
      Query = getQuery(key, value);
      await db.run(Query);
      response.send("Category Updated");
    }
    if ("dueDate" in todoDetails) {
      const { dueDate } = todoDetails;
      key = "due_date";
      value = dueDate;
      Query = getQuery(key, value);
      await db.run(Query);
      response.send("Due Date Updated");
    }
  } catch (error) {
    console.log(`ERROR API ${error.message}`);
  }
});

//API 6 DELETE
app.delete("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    const Query = `
        DELETE FROM
            todo
        WHERE
            id=${todoId};`;
    await db.run(Query);
    response.send("Todo Deleted");
  } catch (error) {
    console.log(`ERROR API ${error.message}`);
  }
});

module.exports = app;
