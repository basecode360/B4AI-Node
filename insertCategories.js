/*

import mongoose from 'mongoose';
import connectDB from './utils/db.js';
import Category from './models/categoriesModel.js';
import Subcategory from './models/subcategoryModel.js';

// Translated categories in French
const categoriesFrench = [
  'Système cardiovasculaire',
  'Système endocrinien',
  'Système gastro-intestinal',
  'Neurologie et sens spéciaux',
  'Système musculo-squelettique, peau et tissu sous-cutané',
  'Système respiratoire',
  'Système rénal et urinaire',
  'Système reproducteur',
  'Sang et systèmes lymphoïde/ immunitaire',
  'Santé comportementale',
  'Biochimie',
  'Biologie',
  'Immunologie (principes généraux)',
  'Pathologie (principes généraux)',
  'Pharmacologie (principes généraux)',
  'Microbiologie',
  'Sciences de la santé publique',
  'Anatomie (principes généraux)',
  'Physiologie (principes généraux)',
  'Interprétation de la littérature médicale',
  'Sciences sociales',
];

// Translated subcategories in French
const subcategoriesFrench = [
  'Anatomie et embryologie',
  'Physiologie',
  'Pathologie et troubles',
  'Pharmacologie',
  'Corrélations cliniques et maladies',
  'Glandes et hormones',
  'Système hépatobiliaire (foie et pancréas)',
  'Système nerveux central (cerveau et moelle épinière)',
  'Système nerveux périphérique',
  'Sens spéciaux (vision, audition, équilibre)',
  'Anatomie et embryologie musculo-squelettique',
  'Dermatologie (peau)',
  'Physiologie rénale et électrolytes',
  'Système reproducteur masculin',
  'Système reproducteur féminin',
  'Obstétrique et gynécologie',
  'Hématologie (cellules sanguines, anémies)',
  'Système lymphatique',
  'Psychiatrie (troubles et critères DSM)',
  'Psychologie (science du comportement)',
  'Neuropsychologie',
  'Biologie moléculaire et génétique',
  'Métabolisme (glucides, protéines, lipides)',
  'Vitamines et nutrition',
  'Techniques de laboratoire et diagnostic',
  'Immunité innée',
  'Immunité adaptative',
  'Immunodéficiences',
  'Hypersensibilité et allergies',
  'Immunologie de la transplantation',
  'Lésion cellulaire et mort',
  'Inflammation et réparation',
  'Néoplasie et oncologie',
  'Troubles génétiques et du développement',
  'Pharmacocinétique et pharmacodynamie',
  'Classes de médicaments et mécanismes',
  'Réactions indésirables aux médicaments et toxicologie',
  'Thérapeutique clinique et sélection des médicaments',
  'Interprétation de la littérature médicale',
  'Sciences sociales',
];

async function main() {
  await connectDB();

  // Clear existing data (do not touch the current French categories)
  await Category.deleteMany({ language: 'french' });
  await Subcategory.deleteMany({ language: 'french' });

  // Insert the translated categories in French with language set to 'french' and count set to 0
  await Category.insertMany(
    categoriesFrench.map((name) => ({
      name,
      count: 0,
      language: 'french',
    }))
  );

  // Insert the translated subcategories in French with language set to 'french' and count set to 0
  await Subcategory.insertMany(
    subcategoriesFrench.map((name) => ({
      name,
      count: 0,
      language: 'french',
    }))
  );

  console.log('Categories and subcategories in French uploaded!');
  process.exit();
}

main().catch(console.error);


*/
/*
              (SPANISH)
import mongoose from 'mongoose';
import connectDB from './utils/db.js';
import Category from './models/categoriesModel.js';
import Subcategory from './models/subcategoryModel.js';

// Translated categories in Spanish
const categoriesSpanish = [
  'Sistema cardiovascular',
  'Sistema endocrino',
  'Sistema gastrointestinal',
  'Neurología y sentidos especiales',
  'Musculoesquelético, piel y tejido subcutáneo',
  'Sistema respiratorio',
  'Sistema renal y urinario',
  'Sistema reproductor',
  'Sangre y sistemas linfoide/ inmunológico',
  'Salud conductual',
  'Bioquímica',
  'Biología',
  'Inmunología (principios generales)',
  'Patología (principios generales)',
  'Farmacología (principios generales)',
  'Microbiología',
  'Ciencias de la salud pública',
  'Anatomía (principios generales)',
  'Fisiología (principios generales)',
  'Interpretación de la literatura médica',
  'Ciencias sociales',
];

// Translated subcategories in Spanish
const subcategoriesSpanish = [
  'Anatomía y embriología',
  'Fisiología',
  'Patología y trastornos',
  'Farmacología',
  'Correlaciones clínicas y enfermedades',
  'Glándulas y hormonas',
  'Sistema hepatobiliario (hígado y páncreas)',
  'Sistema nervioso central (cerebro y médula espinal)',
  'Sistema nervioso periférico',
  'Sentidos especiales (visión, audición, equilibrio)',
  'Anatomía y embriología musculoesquelética',
  'Dermatología (piel)',
  'Fisiología renal y electrolitos',
  'Sistema reproductor masculino',
  'Sistema reproductor femenino',
  'Obstetricia y ginecología',
  'Hematología (células sanguíneas, anemias)',
  'Sistema linfático',
  'Psiquiatría (trastornos y criterios DSM)',
  'Psicología (ciencia del comportamiento)',
  'Neuropsicología',
  'Biología molecular y genética',
  'Metabolismo (carbohidratos, proteínas, lípidos)',
  'Vitaminas y nutrición',
  'Técnicas de laboratorio y diagnóstico',
  'Inmunidad innata',
  'Inmunidad adaptativa',
  'Inmunodeficiencias',
  'Hipersensibilidad y alergias',
  'Inmunología de trasplante',
  'Lesión celular y muerte',
  'Inflamación y reparación',
  'Neoplasia y oncología',
  'Trastornos genéticos y del desarrollo',
  'Farmacocinética y farmacodinamia',
  'Clases de medicamentos y mecanismos',
  'Reacciones adversas a medicamentos y toxicología',
  'Terapéutica clínica y selección de medicamentos',
  'Interpretación de la literatura médica',
  'Ciencias sociales',
];

async function main() {
  await connectDB();

  // Clear existing data (do not touch the current English categories and subcategories)
  await Category.deleteMany({ language: 'spanish' });
  await Subcategory.deleteMany({ language: 'spanish' });

  // Insert the translated categories in Spanish with language set to 'spanish' and count set to 0
  await Category.insertMany(
    categoriesSpanish.map((name) => ({
      name,
      count: 0,
      language: 'spanish',
    }))
  );

  // Insert the translated subcategories in Spanish with language set to 'spanish' and count set to 0
  await Subcategory.insertMany(
    subcategoriesSpanish.map((name) => ({
      name,
      count: 0,
      language: 'spanish',
    }))
  );

  console.log('Categories and subcategories in Spanish uploaded!');
  process.exit();
}

main().catch(console.error);
*/

/*
              (ENGLISH)
import mongoose from 'mongoose';
import connectDB from './utils/db.js';
import Category from './models/categoriesModel.js';
import Subcategory from './models/subcategoryModel.js';

// List of categories
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

// List of subcategories
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

  // Clear existing data
  await Category.deleteMany({});
  await Subcategory.deleteMany({});

  // Insert categories with language set to 'english' and count set to 0
  await Category.insertMany(
    categories.map((name) => ({
      name,
      count: 0,
      language: 'english',
    }))
  );

  // Insert subcategories with language set to 'english' and count set to 0
  await Subcategory.insertMany(
    subcategories.map((name) => ({
      name,
      count: 0,
      language: 'english',
    }))
  );

  console.log('Categories and subcategories uploaded!');
  process.exit();
}

main().catch(console.error);
*/