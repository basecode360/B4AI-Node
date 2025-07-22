import mongoose from 'mongoose';
import connectDB from './utils/db.js';

import Category from './models/categoriesModel.js';
import Subcategory from './models/subcategoryModel.js'; 


const categories = [
  'Cardiovascular System',
  'Endocrine System',
  'Gastrointestinal System',
  'Neurology & Special Senses',
  'Musculoskeletal, Skin & Subcutaneous Tissue',
  'Respiratory System',
  'Renal & Urinary System',
  'Reproductive System',
  'Blood & Lymphoreticular/Immune Systems',
  'Behavioral Health',
  'Biochemistry',
  'Biology',
  'Immunology (General Principles)',
  'Pathology (General Principles)',
  'Pharmacology (General Principles)',
  'Microbiology',
  'Public Health Sciences',
  'Anatomy (General Principles)',
  'Physiology (General Principles)',
  'Interpretation of Medical Literature',
  'Social Sciences',
];

const subcategories = [
  'Anatomy & Embryology',
  'Physiology',
  'Pathology & Disorders',
  'Pharmacology',
  'Clinical Correlations & Diseases',
  'Glands & Hormones',
  'Hepatobiliary System (Liver & Pancreas)',
  'Central Nervous System (Brain & Spinal Cord)',
  'Peripheral Nervous System',
  'Special Senses (Vision, Hearing, Balance)',
  'Musculoskeletal Anatomy & Embryology',
  'Dermatology (Skin)',
  'Renal Physiology & Electrolytes',
  'Male Reproductive System',
  'Female Reproductive System',
  'Obstetrics & Gynecology',
  'Hematology (Blood Cells, Anemias)',
  'Lymphatic System',
  'Psychiatry (Disorders & DSM Criteria)',
  'Psychology (Behavioral Science)',
  'Neuropsychology',
  'Molecular Biology & Genetics',
  'Metabolism (Carbohydrates, Proteins, Lipids)',
  'Vitamins & Nutrition',
  'Laboratory Techniques & Diagnostics',
  'Innate Immunity',
  'Adaptive Immunity',
  'Immunodeficiencies',
  'Hypersensitivity & Allergies',
  'Transplantation Immunology',
  'Cellular Injury & Death',
  'Inflammation & Repair',
  'Neoplasia & Oncology',
  'Genetic & Developmental Disorders',
  'Pharmacokinetics & Pharmacodynamics',
  'Drug Classes & Mechanisms',
  'Adverse Drug Reactions & Toxicology',
  'Clinical Therapeutics & Drug Selection',
  'Interpretation of Medical Literature',
  'Social Sciences',
];

async function main() {
  await connectDB();

  await Category.deleteMany({});
  await Subcategory.deleteMany({});

  await Category.insertMany(categories.map((name) => ({ name })));
  await Subcategory.insertMany(subcategories.map((name) => ({ name })));

  console.log('Categories and subcategories uploaded!');
  process.exit();
}

main().catch(console.error);
