// Google Apps Script for Travel Map
// This script receives data from the form submission in index.html

// Constants
const SPREADSHEET_ID = "1wvENHweG4e16n514x2zUR-NJmhp3IrUPxTQUFaGRgg0"; // Your Google Sheet ID
const API_KEY = "YOUR_NEW_API_KEY_HERE"; // Replace with your unrestricted API key

// Process POST requests from the form
function doPost(e) {
  try {
    // Log the received parameters for debugging
    console.log("Received form data:", JSON.stringify(e.parameter));
    
    // Extract data from form submission
    const data = {
      timestamp: new Date(),
      year: e.parameter.year || "",
      month: e.parameter.month || "",
      name: e.parameter.name || "",
      description: e.parameter.description || "",
      lat: parseFloat(e.parameter.lat) || 0,
      lng: parseFloat(e.parameter.lng) || 0,
      city: e.parameter.city || "",
      state: e.parameter.state || "",
      country: e.parameter.country || ""
    };
    
    // If location data is missing or incomplete, try to geocode it
    if (!data.city || !data.state || !data.country) {
      console.log("Location data incomplete, attempting to geocode...");
      const geocodeResult = geocodeLatLng(data.lat, data.lng);
      
      // Update missing fields with geocoded data
      data.city = data.city || geocodeResult.city || "";
      data.state = data.state || geocodeResult.state || "";
      data.country = data.country || "";
      
      console.log("After geocoding:", 
                  "City:", data.city, 
                  "State:", data.state, 
                  "Country:", data.country);
    }
    
    // Save the data to Sheet1
    saveDataToSheet(data);
    
    // Update the unique counts in Sheet2
    updateUniqueCounts();
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data saved successfully",
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Log and return error
    console.error("Error in doPost:", error);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Geocode latitude and longitude to get location details
function geocodeLatLng(lat, lng) {
  try {
    // Construct the Google Maps Geocoding API URL
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
    
    // Make the HTTP request
    const response = UrlFetchApp.fetch(url);
    const responseData = JSON.parse(response.getContentText());
    
    // Check if the geocoding was successful
    if (responseData.status !== "OK") {
      console.warn("Geocoding failed with status:", responseData.status);
      return { city: "", state: "", country: "" };
    }
    
    // Parse address components from the response
    const result = responseData.results[0];
    const addressComponents = result.address_components;
    
    // Initialize location data
    let city = "";
    let state = "";
    let country = "";
    
    // Extract location information from address components
    for (const component of addressComponents) {
      const types = component.types;
      
      if (types.includes("locality") || types.includes("postal_town")) {
        city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        state = component.long_name;
      } else if (types.includes("country")) {
        country = component.long_name;
      }
    }
    
    console.log("Geocoding result:", city, state, country);
    return { city, state, country };
    
  } catch (error) {
    console.error("Error in geocodeLatLng:", error);
    return { city: "", state: "", country: "" };
  }
}

// Save data to Sheet1
function saveDataToSheet(data) {
  try {
    // Open the spreadsheet and get Sheet1
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName("Sheet1");
    
    // Find the next empty row
    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;
    
    // Prepare the row data in the correct column order according to user's preferred layout:
    // Timestamp, Year, Latitude, Longitude, Name, Description, Month, State, Country
    const rowData = [
      data.timestamp,  // Column A: Timestamp
      data.year,       // Column B: Year
      data.lat,        // Column C: Latitude
      data.lng,        // Column D: Longitude
      data.name,       // Column E: Name 
      data.description,// Column F: Description
      data.month,      // Column G: Month
      data.state,      // Column H: State
      data.country     // Column I: Country
    ];
    
    // Write the data to the sheet
    sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
    console.log("Data saved to Sheet1, row:", newRow);
    
  } catch (error) {
    console.error("Error in saveDataToSheet:", error);
    throw error;
  }
}

// Update the unique counts in Sheet2 (A2: unique countries, B2: unique states)
function updateUniqueCounts() {
  try {
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet1 = spreadsheet.getSheetByName("Sheet1");
    const sheet2 = spreadsheet.getSheetByName("Sheet2");
    
    // Ensure Sheet2 exists, create it if not
    if (!sheet2) {
      console.log("Sheet2 not found, creating it...");
      spreadsheet.insertSheet("Sheet2");
      // Set headers in Sheet2
      sheet2.getRange("A1").setValue("Unique Countries");
      sheet2.getRange("B1").setValue("Unique States");
    }
    
    // Get all data from Sheet1
    const data = sheet1.getDataRange().getValues();
    
    // Skip the header row and collect unique countries and states
    const uniqueCountries = new Set();
    const uniqueStates = new Set();
    
    // Log the data structure for debugging
    console.log("Data length: " + data.length);
    if (data.length > 1) {
      console.log("First row structure: " + JSON.stringify(data[1]));
    }
    
    // Based on our column order:
    // State is in column H (index 7)
    // Country is in column I (index 8)
    for (let i = 1; i < data.length; i++) {
      const state = data[i][7];  // Column H (index 7)
      const country = data[i][8]; // Column I (index 8)
      
      if (country && country.trim() !== "") {
        uniqueCountries.add(country.trim());
        console.log("Added country: " + country.trim());
      }
      
      if (state && state.trim() !== "") {
        uniqueStates.add(state.trim());
        console.log("Added state: " + state.trim());
      }
    }
    
    // Convert Sets to Arrays for logging
    const countriesArray = Array.from(uniqueCountries);
    const statesArray = Array.from(uniqueStates);
    
    console.log("Unique countries found: " + countriesArray.join(", "));
    console.log("Unique states found: " + statesArray.join(", "));
    
    // Update the counts in Sheet2
    sheet2.getRange("A2").setValue(uniqueCountries.size);
    sheet2.getRange("B2").setValue(uniqueStates.size);
    
    // Also save the lists for reference
    if (countriesArray.length > 0) {
      sheet2.getRange("A3").setValue(countriesArray.join(", "));
    }
    if (statesArray.length > 0) {
      sheet2.getRange("B3").setValue(statesArray.join(", "));
    }
    
    console.log("Updated Sheet2 with counts - Countries:", uniqueCountries.size, "States:", uniqueStates.size);
    
  } catch (error) {
    console.error("Error in updateUniqueCounts:", error);
    throw error;
  }
}

// Test function that can be run manually
function testUpdateCounts() {
  updateUniqueCounts();
}

// Get doGet function to handle GET requests (for testing)
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "The script is working!"
  })).setMimeType(ContentService.MimeType.JSON);
}