// MongoDB Universities Population Script
// For CSV with columns: country, university, website

import mongoose from "mongoose";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

// MongoDB Connection - Update with your connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://danie123123:danie123123@cluster0.orbixvd.mongodb.net/";

// University Schema (matching your CSV structure)
const universitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    default: null
  },
  // Additional computed fields
  type: {
    type: String,
    enum: ['University', 'College', 'Institute', 'School', 'Academy'],
    default: 'University'
  },
  medicalPrograms: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Metadata
  dataSource: {
    type: String,
    default: 'CSV_Import'
  },
  importedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better performance
universitySchema.index({ country: 1, name: 1 }, { unique: true });
universitySchema.index({ name: 'text', country: 'text' });
universitySchema.index({ country: 1 });

const University = mongoose.model('University', universitySchema);

// CSV Data Processor Class
class UniversityDataProcessor {
  constructor() {
    this.processed = 0;
    this.duplicates = 0;
    this.errors = 0;
    this.inserted = 0;
  }

  // Clean and validate university name
  cleanUniversityName(name) {
    if (!name) return null;
    
    // Remove extra whitespace and clean up
    name = name.toString().trim();
    
    // Remove common prefixes/suffixes that might cause duplicates
    name = name.replace(/^(The\s+)/i, '');
    
    // Capitalize properly
    name = this.toTitleCase(name);
    
    return name;
  }

  // Clean country name
  cleanCountryName(country) {
    if (!country) return null;
    
    country = country.toString().trim();
    
    // Handle common country name variations
    const countryMappings = {
      'USA': 'United States',
      'US': 'United States',
      'America': 'United States',
      'UK': 'United Kingdom',
      'Britain': 'United Kingdom',
      'England': 'United Kingdom',
      'Scotland': 'United Kingdom',
      'Wales': 'United Kingdom',
      'N. Ireland': 'United Kingdom',
      'Northern Ireland': 'United Kingdom'
    };
    
    return countryMappings[country] || this.toTitleCase(country);
  }

  // Clean website URL
  cleanWebsite(website) {
    if (!website || website.toString().trim() === '') return null;
    
    website = website.toString().trim().toLowerCase();
    
    // Remove common prefixes
    website = website.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    // Remove trailing slashes
    website = website.replace(/\/$/, '');
    
    // Add https:// prefix if not empty
    if (website) {
      website = 'https://' + website;
    }
    
    // Validate URL format
    try {
      new URL(website);
      return website;
    } catch (e) {
      return null; // Invalid URL
    }
  }

  // Convert to title case
  toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // Determine institution type from name
  determineType(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('university')) return 'University';
    if (nameLower.includes('college')) return 'College';
    if (nameLower.includes('institute')) return 'Institute';
    if (nameLower.includes('school')) return 'School';
    if (nameLower.includes('academy')) return 'Academy';
    
    return 'University'; // Default
  }

  // Check if institution has medical programs
  hasMedicalPrograms(name) {
    const medicalKeywords = [
      'medical', 'medicine', 'health', 'nursing', 'pharmacy', 
      'dental', 'veterinary', 'biomedical', 'clinical', 'hospital'
    ];
    
    const nameLower = name.toLowerCase();
    return medicalKeywords.some(keyword => nameLower.includes(keyword));
  }

  // Process a single CSV row
  processRow(row, rowIndex) {
    try {
      // Extract data from CSV columns: country, university, website
      const countryRaw = row.country || row.Country;
      const universityRaw = row.university || row.University;
      const websiteRaw = row.website || row.Website;

      // Clean the data
      const country = this.cleanCountryName(countryRaw);
      const name = this.cleanUniversityName(universityRaw);
      const website = this.cleanWebsite(websiteRaw);

      // Validate required fields
      if (!country || !name) {
        console.log(`❌ Row ${rowIndex + 2}: Missing required data - Country: "${countryRaw}", University: "${universityRaw}"`);
        this.errors++;
        return null;
      }

      // Skip if name is too short
      if (name.length < 3) {
        console.log(`❌ Row ${rowIndex + 2}: University name too short: "${name}"`);
        this.errors++;
        return null;
      }

      // Create university document
      const universityDoc = {
        name: name,
        country: country,
        website: website,
        type: this.determineType(name),
        medicalPrograms: this.hasMedicalPrograms(name),
        dataSource: 'CSV_Import',
        importedAt: new Date()
      };

      this.processed++;
      return universityDoc;

    } catch (error) {
      console.error(`❌ Error processing row ${rowIndex + 2}:`, error.message);
      this.errors++;
      return null;
    }
  }

  // Generate statistics report
  getStats() {
    return {
      totalProcessed: this.processed,
      successfullyInserted: this.inserted,
      duplicatesSkipped: this.duplicates,
      errors: this.errors,
      successRate: this.processed > 0 ? ((this.inserted / this.processed) * 100).toFixed(2) + '%' : '0%'
    };
  }
}

// Main population function
async function populateUniversitiesFromCSV(csvFilePath) {
  try {
    console.log('🚀 Starting MongoDB Universities Population...');
    console.log(`📂 Reading CSV file: ${csvFilePath}`);

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read CSV file
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    console.log('📖 CSV file loaded successfully');

    // Initialize processor
    const processor = new UniversityDataProcessor();

    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // Keep everything as strings for better control
        complete: async (results) => {
          try {
            console.log(`📊 Found ${results.data.length} rows in CSV`);
            
            // Process each row
            const universityDocs = [];
            const duplicateChecks = new Set();
            
            for (let i = 0; i < results.data.length; i++) {
              const row = results.data[i];
              const processedDoc = processor.processRow(row, i);
              
              if (processedDoc) {
                // Create unique key for duplicate checking
                const uniqueKey = `${processedDoc.country.toLowerCase()}|||${processedDoc.name.toLowerCase()}`;
                
                if (duplicateChecks.has(uniqueKey)) {
                  console.log(`⚠️  Duplicate in CSV: ${processedDoc.name} in ${processedDoc.country}`);
                  processor.duplicates++;
                  continue;
                }
                
                duplicateChecks.add(uniqueKey);
                universityDocs.push(processedDoc);
              }
            }

            console.log(`✅ Processed ${universityDocs.length} valid universities`);

            // Batch insert into MongoDB with duplicate handling
            if (universityDocs.length > 0) {
              console.log('💾 Inserting into MongoDB...');
              
              // Use insertMany with ordered:false to continue on duplicates
              try {
                const result = await University.insertMany(universityDocs, { 
                  ordered: false,
                  rawResult: true 
                });
                processor.inserted = result.insertedCount || universityDocs.length;
              } catch (insertError) {
                // Handle duplicate key errors
                if (insertError.writeErrors) {
                  const duplicateErrors = insertError.writeErrors.filter(err => err.code === 11000);
                  processor.duplicates += duplicateErrors.length;
                  processor.inserted = universityDocs.length - duplicateErrors.length;
                  
                  console.log(`⚠️  Found ${duplicateErrors.length} duplicates in database`);
                } else {
                  throw insertError;
                }
              }
            }

            // Generate final report
            const stats = processor.getStats();
            console.log('\n📈 IMPORT COMPLETED!');
            console.log('========================');
            console.log(`Total Rows Processed: ${stats.totalProcessed}`);
            console.log(`Successfully Inserted: ${stats.successfullyInserted}`);
            console.log(`Duplicates Skipped: ${stats.duplicatesSkipped}`);
            console.log(`Errors: ${stats.errors}`);
            console.log(`Success Rate: ${stats.successRate}`);
            console.log('========================\n');

            resolve(stats);

          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });

  } catch (error) {
    console.error('❌ Population failed:', error);
    throw error;
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed');
  }
}

// Utility function to download the worldwide universities CSV
async function downloadUniversitiesCSV() {
  console.log('📥 Downloading universities CSV from GitHub...');
  
  try {
    const response = await fetch('https://raw.githubusercontent.com/code4mk/Universities-Worldwide/master/csv/universities.csv');
    const csvContent = await response.text();
    
    const filePath = './universities_worldwide.csv';
    fs.writeFileSync(filePath, csvContent);
    
    console.log(`✅ Downloaded CSV to: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('❌ Failed to download CSV:', error);
    throw error;
  }
}

// Command line execution
async function main() {
  try {
    const args = process.argv.slice(2);
    let csvFilePath = args[0];

    if (!csvFilePath) {
      console.log('🌐 No CSV file provided, downloading from GitHub...');
      csvFilePath = await downloadUniversitiesCSV();
    }

    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    await populateUniversitiesFromCSV(csvFilePath);
    console.log('🎉 Database population completed successfully!');

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other modules
export { 
  populateUniversitiesFromCSV, 
  downloadUniversitiesCSV, 
  University, 
  UniversityDataProcessor 
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}