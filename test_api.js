const axios = require("axios");

async function testApi() {
  try {
    const res = await axios.get("http://localhost:5000/api/issues");
    console.log("Status:", res.status);
    console.log("Data Summary:", {
      success: res.data.success,
      issuesCount: res.data.issues?.length,
      total: res.data.total
    });
    if (res.data.issues?.length > 0) {
      console.log("First Issue:", JSON.stringify(res.data.issues[0], null, 2));
    }
  } catch (err) {
    console.error("API Error:", err.message);
    if (err.response) {
      console.error("Response Data:", err.response.data);
    }
  }
}

testApi();
