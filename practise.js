// 1. Error Handling Middleware
// 404 Error Handler
// ager koi route nahi mila toh 404 error handler call hoga
app.use((req, res) => {
  res.status(404).render("404", { url : req.originalUrl });
}); 

// Global Error Handler
// ager koi error aayega toh global error handler call hoga
// err kya hota hai ? : jo error aayega wo err object me aayega
// req, res, next kya hota hai ? : jo req, res, next hai wo jo bhi middleware hai wo call hoga
// next kya hota hai ? : next is a function that is used to call the next middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    message : "Something went wrong",
  });
});