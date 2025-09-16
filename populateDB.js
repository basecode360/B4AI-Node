
// Quick Database Population Runner
// Save this as: populateDB.js

import mongoose from "mongoose";
import Papa from "papaparse";
import fs from "fs";

// Your MongoDB connection string (update if needed)
const MONGODB_URI = "mongodb+srv://danie123123:danie123123@cluster0.orbixvd.mongodb.net/";

// University Schema
const universitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  website: { type: String, trim: true, default: null },
  type: { type: String, default: 'University' },
  medicalPrograms: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  importedAt: { type: Date, default: Date.now }
}, { timestamps: true });

universitySchema.index({ country: 1, name: 1 }, { unique: true });
const University = mongoose.model('University', universitySchema);

// Quick population function
async function quickPopulate() {
  try {
    await mongoose.connect(MONGODB_URI);

    // Sample CSV content (you can replace this with your actual CSV file path)
    const csvFilePath = './universities.csv';
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });


    let inserted = 0;
    let duplicates = 0;
    let errors = 0;

    for (const row of parseResult.data) {
      try {
        // Clean data
        const name = row.university?.trim();
        const country = row.country?.trim();
        let website = row.website?.trim();

        if (!name || !country) {
          errors++;
          continue;
        }

        // Clean website
        if (website && !website.startsWith('http')) {
          website = 'https://' + website;
        }

        // Check for medical programs
        const medicalKeywords = ['medical', 'medicine', 'health', 'nursing', 'pharmacy'];
        const hasMedical = medicalKeywords.some(keyword => 
          name.toLowerCase().includes(keyword)
        );

        // Create university document
        const universityDoc = {
          name: name,
          country: country,
          website: website || null,
          type: name.toLowerCase().includes('university') ? 'University' : 'College',
          medicalPrograms: hasMedical,
          isActive: true
        };

        // Try to insert
        await University.create(universityDoc);
        inserted++;

      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error
          duplicates++;
        } else {
          errors++;
        }
      }
    }

    // Final stats

    // Show some results
    const totalCount = await University.countDocuments();
    const countries = await University.distinct('country');
    

  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
}

// Run the population
quickPopulate();

