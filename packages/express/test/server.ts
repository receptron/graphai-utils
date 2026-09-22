// express server example: yarn run server
import { app } from "./express";

const port = 8085;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
