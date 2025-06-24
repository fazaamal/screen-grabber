import ogs from "open-graph-scraper"

const options = {
  url: "https://www.freemalaysiatoday.com/category/nation/2025/06/23/no-motion-received-to-lift-hishams-umno-suspension-says-azalina",
}
await ogs(options).then((data) => {
  // console.log(data)
  const { error, html, result, response } = data
  // console.log("error:", error) // This returns true or false. True if there was an error. The error itself is inside the result object.
  // console.log("html:", html) // This contains the HTML of page
  console.log("result:", result) // This contains all of the Open Graph results
  // console.log("response:", response) // This contains response from the Fetch API
})
