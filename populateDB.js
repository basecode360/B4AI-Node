
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
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Sample CSV content (you can replace this with your actual CSV file path)
    const csvFilePath = './universities.csv';
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });

    console.log(`📊 Processing ${parseResult.data.length} universities...`);

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
          console.log(`❌ Skipping row with missing data: ${name || 'NO_NAME'} in ${country || 'NO_COUNTRY'}`);
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
        console.log(`✅ Inserted: ${name} (${country})`);
        inserted++;

      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error
          console.log(`⚠️  Duplicate: ${row.university} in ${row.country}`);
          duplicates++;
        } else {
          console.error(`❌ Error inserting ${row.university}:`, error.message);
          errors++;
        }
      }
    }

    // Final stats
    console.log('\n🎉 POPULATION COMPLETED!');
    console.log('========================');
    console.log(`✅ Successfully inserted: ${inserted}`);
    console.log(`⚠️  Duplicates skipped: ${duplicates}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('========================\n');

    // Show some results
    const totalCount = await University.countDocuments();
    const countries = await University.distinct('country');
    
    console.log(`📊 Database now contains:`);
    console.log(`   - ${totalCount} universities`);
    console.log(`   - ${countries.length} countries`);
    console.log(`   - Countries: ${countries.slice(0, 5).join(', ')}${countries.length > 5 ? '...' : ''}`);

  } catch (error) {
    console.error('💥 Population failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the population
quickPopulate();

