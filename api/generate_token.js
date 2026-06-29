const jwt = require("jsonwebtoken");
console.log(jwt.sign({ id: "admin-id", email: "vietnmf8@fullstack.edu.vn", role: "ADMIN" }, "xncgDtx6BgAa9GM6RNd6MajJC6HXfycq93RdZN3NUiw="));
