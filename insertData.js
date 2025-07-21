// insertData.js - Run this file to insert all data into MongoDB
import { MongoClient } from 'mongodb';

// Your MongoDB URI
const uri = "mongodb+srv://danie123123:danie123123@cluster0.orbixvd.mongodb.net/";
const dbName = "test"; // Change this to your database name if different

// Country data
const COUNTRY_DATA = [
  { countryId: 1, label: "USA", value: "usa", flag: "🇺🇸", isActive: true },
  { countryId: 2, label: "Canada", value: "canada", flag: "🇨🇦", isActive: true },
  { countryId: 3, label: "Afghanistan", value: "afghanistan", flag: "🇦🇫", isActive: true },
  { countryId: 4, label: "Albania", value: "albania", flag: "🇦🇱", isActive: true },
  { countryId: 5, label: "Algeria", value: "algeria", flag: "🇩🇿", isActive: true },
  { countryId: 6, label: "Andorra", value: "andorra", flag: "🇦🇩", isActive: true },
  { countryId: 7, label: "Angola", value: "angola", flag: "🇦🇴", isActive: true },
  { countryId: 8, label: "Antigua and Barbuda", value: "antigua_barbuda", flag: "🇦🇬", isActive: true },
  { countryId: 9, label: "Argentina", value: "argentina", flag: "🇦🇷", isActive: true },
  { countryId: 10, label: "Armenia", value: "armenia", flag: "🇦🇲", isActive: true },
  { countryId: 11, label: "Australia", value: "australia", flag: "🇦🇺", isActive: true },
  { countryId: 12, label: "Austria", value: "austria", flag: "🇦🇹", isActive: true },
  { countryId: 13, label: "Azerbaijan", value: "azerbaijan", flag: "🇦🇿", isActive: true },
  { countryId: 14, label: "Bahamas", value: "bahamas", flag: "🇧🇸", isActive: true },
  { countryId: 15, label: "Bahrain", value: "bahrain", flag: "🇧🇭", isActive: true },
  { countryId: 16, label: "Bangladesh", value: "bangladesh", flag: "🇧🇩", isActive: true },
  { countryId: 17, label: "Barbados", value: "barbados", flag: "🇧🇧", isActive: true },
  { countryId: 18, label: "Belarus", value: "belarus", flag: "🇧🇾", isActive: true },
  { countryId: 19, label: "Belgium", value: "belgium", flag: "🇧🇪", isActive: true },
  { countryId: 20, label: "Belize", value: "belize", flag: "🇧🇿", isActive: true },
  { countryId: 21, label: "Benin", value: "benin", flag: "🇧🇯", isActive: true },
  { countryId: 22, label: "Bhutan", value: "bhutan", flag: "🇧🇹", isActive: true },
  { countryId: 23, label: "Bolivia", value: "bolivia", flag: "🇧🇴", isActive: true },
  { countryId: 24, label: "Bosnia and Herzegovina", value: "bosnia_herzegovina", flag: "🇧🇦", isActive: true },
  { countryId: 25, label: "Botswana", value: "botswana", flag: "🇧🇼", isActive: true },
  { countryId: 26, label: "Brazil", value: "brazil", flag: "🇧🇷", isActive: true },
  { countryId: 27, label: "Brunei", value: "brunei", flag: "🇧🇳", isActive: true },
  { countryId: 28, label: "Bulgaria", value: "bulgaria", flag: "🇧🇬", isActive: true },
  { countryId: 29, label: "Burkina Faso", value: "burkina_faso", flag: "🇧🇫", isActive: true },
  { countryId: 30, label: "Burundi", value: "burundi", flag: "🇧🇮", isActive: true },
  { countryId: 31, label: "Cambodia", value: "cambodia", flag: "🇰🇭", isActive: true },
  { countryId: 32, label: "Cameroon", value: "cameroon", flag: "🇨🇲", isActive: true },
  { countryId: 33, label: "Cape Verde", value: "cape_verde", flag: "🇨🇻", isActive: true },
  { countryId: 34, label: "Central African Republic", value: "central_african_republic", flag: "🇨🇫", isActive: true },
  { countryId: 35, label: "Chad", value: "chad", flag: "🇹🇩", isActive: true },
  { countryId: 36, label: "Chile", value: "chile", flag: "🇨🇱", isActive: true },
  { countryId: 37, label: "China", value: "china", flag: "🇨🇳", isActive: true },
  { countryId: 38, label: "Colombia", value: "colombia", flag: "🇨🇴", isActive: true },
  { countryId: 39, label: "Comoros", value: "comoros", flag: "🇰🇲", isActive: true },
  { countryId: 40, label: "Congo (Democratic Republic)", value: "congo_dr", flag: "🇨🇩", isActive: true },
  { countryId: 41, label: "Congo (Republic)", value: "congo_republic", flag: "🇨🇬", isActive: true },
  { countryId: 42, label: "Costa Rica", value: "costa_rica", flag: "🇨🇷", isActive: true },
  { countryId: 43, label: "Croatia", value: "croatia", flag: "🇭🇷", isActive: true },
  { countryId: 44, label: "Cuba", value: "cuba", flag: "🇨🇺", isActive: true },
  { countryId: 45, label: "Cyprus", value: "cyprus", flag: "🇨🇾", isActive: true },
  { countryId: 46, label: "Czech Republic", value: "czech_republic", flag: "🇨🇿", isActive: true },
  { countryId: 47, label: "Denmark", value: "denmark", flag: "🇩🇰", isActive: true },
  { countryId: 48, label: "Djibouti", value: "djibouti", flag: "🇩🇯", isActive: true },
  { countryId: 49, label: "Dominica", value: "dominica", flag: "🇩🇲", isActive: true },
  { countryId: 50, label: "Dominican Republic", value: "dominican_republic", flag: "🇩🇴", isActive: true },
  { countryId: 51, label: "East Timor (Timor-Leste)", value: "east_timor", flag: "🇹🇱", isActive: true },
  { countryId: 52, label: "Ecuador", value: "ecuador", flag: "🇪🇨", isActive: true },
  { countryId: 53, label: "Egypt", value: "egypt", flag: "🇪🇬", isActive: true },
  { countryId: 54, label: "El Salvador", value: "el_salvador", flag: "🇸🇻", isActive: true },
  { countryId: 55, label: "Equatorial Guinea", value: "equatorial_guinea", flag: "🇬🇶", isActive: true },
  { countryId: 56, label: "Eritrea", value: "eritrea", flag: "🇪🇷", isActive: true },
  { countryId: 57, label: "Estonia", value: "estonia", flag: "🇪🇪", isActive: true },
  { countryId: 58, label: "Eswatini", value: "eswatini", flag: "🇸🇿", isActive: true },
  { countryId: 59, label: "Ethiopia", value: "ethiopia", flag: "🇪🇹", isActive: true },
  { countryId: 60, label: "Fiji", value: "fiji", flag: "🇫🇯", isActive: true },
  { countryId: 61, label: "Finland", value: "finland", flag: "🇫🇮", isActive: true },
  { countryId: 62, label: "France", value: "france", flag: "🇫🇷", isActive: true },
  { countryId: 63, label: "Gabon", value: "gabon", flag: "🇬🇦", isActive: true },
  { countryId: 64, label: "Gambia", value: "gambia", flag: "🇬🇲", isActive: true },
  { countryId: 65, label: "Georgia", value: "georgia", flag: "🇬🇪", isActive: true },
  { countryId: 66, label: "Germany", value: "germany", flag: "🇩🇪", isActive: true },
  { countryId: 67, label: "Ghana", value: "ghana", flag: "🇬🇭", isActive: true },
  { countryId: 68, label: "Greece", value: "greece", flag: "🇬🇷", isActive: true },
  { countryId: 69, label: "Grenada", value: "grenada", flag: "🇬🇩", isActive: true },
  { countryId: 70, label: "Guatemala", value: "guatemala", flag: "🇬🇹", isActive: true },
  { countryId: 71, label: "Guinea", value: "guinea", flag: "🇬🇳", isActive: true },
  { countryId: 72, label: "Guinea-Bissau", value: "guinea_bissau", flag: "🇬🇼", isActive: true },
  { countryId: 73, label: "Guyana", value: "guyana", flag: "🇬🇾", isActive: true },
  { countryId: 74, label: "Haiti", value: "haiti", flag: "🇭🇹", isActive: true },
  { countryId: 75, label: "Honduras", value: "honduras", flag: "🇭🇳", isActive: true },
  { countryId: 76, label: "Hungary", value: "hungary", flag: "🇭🇺", isActive: true },
  { countryId: 77, label: "Iceland", value: "iceland", flag: "🇮🇸", isActive: true },
  { countryId: 78, label: "India", value: "india", flag: "🇮🇳", isActive: true },
  { countryId: 79, label: "Indonesia", value: "indonesia", flag: "🇮🇩", isActive: true },
  { countryId: 80, label: "Iran", value: "iran", flag: "🇮🇷", isActive: true },
  { countryId: 81, label: "Iraq", value: "iraq", flag: "🇮🇶", isActive: true },
  { countryId: 82, label: "Ireland", value: "ireland", flag: "🇮🇪", isActive: true },
  { countryId: 83, label: "Israel", value: "israel", flag: "🇮🇱", isActive: true },
  { countryId: 84, label: "Italy", value: "italy", flag: "🇮🇹", isActive: true },
  { countryId: 85, label: "Jamaica", value: "jamaica", flag: "🇯🇲", isActive: true },
  { countryId: 86, label: "Japan", value: "japan", flag: "🇯🇵", isActive: true },
  { countryId: 87, label: "Jordan", value: "jordan", flag: "🇯🇴", isActive: true },
  { countryId: 88, label: "Kazakhstan", value: "kazakhstan", flag: "🇰🇿", isActive: true },
  { countryId: 89, label: "Kenya", value: "kenya", flag: "🇰🇪", isActive: true },
  { countryId: 90, label: "Kiribati", value: "kiribati", flag: "🇰🇮", isActive: true },
  { countryId: 91, label: "Kuwait", value: "kuwait", flag: "🇰🇼", isActive: true },
  { countryId: 92, label: "Kyrgyzstan", value: "kyrgyzstan", flag: "🇰🇬", isActive: true },
  { countryId: 93, label: "Laos", value: "laos", flag: "🇱🇦", isActive: true },
  { countryId: 94, label: "Latvia", value: "latvia", flag: "🇱🇻", isActive: true },
  { countryId: 95, label: "Lebanon", value: "lebanon", flag: "🇱🇧", isActive: true },
  { countryId: 96, label: "Lesotho", value: "lesotho", flag: "🇱🇸", isActive: true },
  { countryId: 97, label: "Liberia", value: "liberia", flag: "🇱🇷", isActive: true },
  { countryId: 98, label: "Libya", value: "libya", flag: "🇱🇾", isActive: true },
  { countryId: 99, label: "Liechtenstein", value: "liechtenstein", flag: "🇱🇮", isActive: true },
  { countryId: 100, label: "Lithuania", value: "lithuania", flag: "🇱🇹", isActive: true },
  { countryId: 101, label: "Luxembourg", value: "luxembourg", flag: "🇱🇺", isActive: true },
  { countryId: 102, label: "Madagascar", value: "madagascar", flag: "🇲🇬", isActive: true },
  { countryId: 103, label: "Malawi", value: "malawi", flag: "🇲🇼", isActive: true },
  { countryId: 104, label: "Malaysia", value: "malaysia", flag: "🇲🇾", isActive: true },
  { countryId: 105, label: "Maldives", value: "maldives", flag: "🇲🇻", isActive: true },
  { countryId: 106, label: "Mali", value: "mali", flag: "🇲🇱", isActive: true },
  { countryId: 107, label: "Malta", value: "malta", flag: "🇲🇹", isActive: true },
  { countryId: 108, label: "Marshall Islands", value: "marshall_islands", flag: "🇲🇭", isActive: true },
  { countryId: 109, label: "Mauritania", value: "mauritania", flag: "🇲🇷", isActive: true },
  { countryId: 110, label: "Mauritius", value: "mauritius", flag: "🇲🇺", isActive: true },
  { countryId: 111, label: "Mexico", value: "mexico", flag: "🇲🇽", isActive: true },
  { countryId: 112, label: "Micronesia", value: "micronesia", flag: "🇫🇲", isActive: true },
  { countryId: 113, label: "Moldova", value: "moldova", flag: "🇲🇩", isActive: true },
  { countryId: 114, label: "Monaco", value: "monaco", flag: "🇲🇨", isActive: true },
  { countryId: 115, label: "Mongolia", value: "mongolia", flag: "🇲🇳", isActive: true },
  { countryId: 116, label: "Montenegro", value: "montenegro", flag: "🇲🇪", isActive: true },
  { countryId: 117, label: "Morocco", value: "morocco", flag: "🇲🇦", isActive: true },
  { countryId: 118, label: "Mozambique", value: "mozambique", flag: "🇲🇿", isActive: true },
  { countryId: 119, label: "Myanmar", value: "myanmar", flag: "🇲🇲", isActive: true },
  { countryId: 120, label: "Namibia", value: "namibia", flag: "🇳🇦", isActive: true },
  { countryId: 121, label: "Nauru", value: "nauru", flag: "🇳🇷", isActive: true },
  { countryId: 122, label: "Nepal", value: "nepal", flag: "🇳🇵", isActive: true },
  { countryId: 123, label: "Netherlands", value: "netherlands", flag: "🇳🇱", isActive: true },
  { countryId: 124, label: "New Zealand", value: "new_zealand", flag: "🇳🇿", isActive: true },
  { countryId: 125, label: "Nicaragua", value: "nicaragua", flag: "🇳🇮", isActive: true },
  { countryId: 126, label: "Niger", value: "niger", flag: "🇳🇪", isActive: true },
  { countryId: 127, label: "Nigeria", value: "nigeria", flag: "🇳🇬", isActive: true },
  { countryId: 128, label: "North Korea", value: "north_korea", flag: "🇰🇵", isActive: true },
  { countryId: 129, label: "North Macedonia", value: "north_macedonia", flag: "🇲🇰", isActive: true },
  { countryId: 130, label: "Norway", value: "norway", flag: "🇳🇴", isActive: true },
  { countryId: 131, label: "Oman", value: "oman", flag: "🇴🇲", isActive: true },
  { countryId: 132, label: "Pakistan", value: "pakistan", flag: "🇵🇰", isActive: true },
  { countryId: 133, label: "Palau", value: "palau", flag: "🇵🇼", isActive: true },
  { countryId: 134, label: "Panama", value: "panama", flag: "🇵🇦", isActive: true },
  { countryId: 135, label: "Papua New Guinea", value: "papua_new_guinea", flag: "🇵🇬", isActive: true },
  { countryId: 136, label: "Paraguay", value: "paraguay", flag: "🇵🇾", isActive: true },
  { countryId: 137, label: "Peru", value: "peru", flag: "🇵🇪", isActive: true },
  { countryId: 138, label: "Philippines", value: "philippines", flag: "🇵🇭", isActive: true },
  { countryId: 139, label: "Poland", value: "poland", flag: "🇵🇱", isActive: true },
  { countryId: 140, label: "Portugal", value: "portugal", flag: "🇵🇹", isActive: true },
  { countryId: 141, label: "Qatar", value: "qatar", flag: "🇶🇦", isActive: true },
  { countryId: 142, label: "Romania", value: "romania", flag: "🇷🇴", isActive: true },
  { countryId: 143, label: "Russia", value: "russia", flag: "🇷🇺", isActive: true },
  { countryId: 144, label: "Rwanda", value: "rwanda", flag: "🇷🇼", isActive: true },
  { countryId: 145, label: "Saint Kitts and Nevis", value: "saint_kitts_nevis", flag: "🇰🇳", isActive: true },
  { countryId: 146, label: "Saint Lucia", value: "saint_lucia", flag: "🇱🇨", isActive: true },
  { countryId: 147, label: "Saint Vincent and the Grenadines", value: "saint_vincent_grenadines", flag: "🇻🇨", isActive: true },
  { countryId: 148, label: "Samoa", value: "samoa", flag: "🇼🇸", isActive: true },
  { countryId: 149, label: "San Marino", value: "san_marino", flag: "🇸🇲", isActive: true },
  { countryId: 150, label: "Saudi Arabia", value: "saudi_arabia", flag: "🇸🇦", isActive: true },
  { countryId: 151, label: "Senegal", value: "senegal", flag: "🇸🇳", isActive: true },
  { countryId: 152, label: "Serbia", value: "serbia", flag: "🇷🇸", isActive: true },
  { countryId: 153, label: "Seychelles", value: "seychelles", flag: "🇸🇨", isActive: true },
  { countryId: 154, label: "Sierra Leone", value: "sierra_leone", flag: "🇸🇱", isActive: true },
  { countryId: 155, label: "Singapore", value: "singapore", flag: "🇸🇬", isActive: true },
  { countryId: 156, label: "Slovakia", value: "slovakia", flag: "🇸🇰", isActive: true },
  { countryId: 157, label: "Slovenia", value: "slovenia", flag: "🇸🇮", isActive: true },
  { countryId: 158, label: "Solomon Islands", value: "solomon_islands", flag: "🇸🇧", isActive: true },
  { countryId: 159, label: "Somalia", value: "somalia", flag: "🇸🇴", isActive: true },
  { countryId: 160, label: "South Africa", value: "south_africa", flag: "🇿🇦", isActive: true },
  { countryId: 161, label: "South Korea", value: "south_korea", flag: "🇰🇷", isActive: true },
  { countryId: 162, label: "South Sudan", value: "south_sudan", flag: "🇸🇸", isActive: true },
  { countryId: 163, label: "Spain", value: "spain", flag: "🇪🇸", isActive: true },
  { countryId: 164, label: "Sri Lanka", value: "sri_lanka", flag: "🇱🇰", isActive: true },
  { countryId: 165, label: "Sudan", value: "sudan", flag: "🇸🇩", isActive: true },
  { countryId: 166, label: "Suriname", value: "suriname", flag: "🇸🇷", isActive: true },
  { countryId: 167, label: "Sweden", value: "sweden", flag: "🇸🇪", isActive: true },
  { countryId: 168, label: "Switzerland", value: "switzerland", flag: "🇨🇭", isActive: true },
  { countryId: 169, label: "Syria", value: "syria", flag: "🇸🇾", isActive: true },
  { countryId: 170, label: "Taiwan", value: "taiwan", flag: "🇹🇼", isActive: true },
  { countryId: 171, label: "Tajikistan", value: "tajikistan", flag: "🇹🇯", isActive: true },
  { countryId: 172, label: "Tanzania", value: "tanzania", flag: "🇹🇿", isActive: true },
  { countryId: 173, label: "Thailand", value: "thailand", flag: "🇹🇭", isActive: true },
  { countryId: 174, label: "Togo", value: "togo", flag: "🇹🇬", isActive: true },
  { countryId: 175, label: "Tonga", value: "tonga", flag: "🇹🇴", isActive: true },
  { countryId: 176, label: "Trinidad and Tobago", value: "trinidad_tobago", flag: "🇹🇹", isActive: true },
  { countryId: 177, label: "Tunisia", value: "tunisia", flag: "🇹🇳", isActive: true },
  { countryId: 178, label: "Turkey", value: "turkey", flag: "🇹🇷", isActive: true },
  { countryId: 179, label: "Turkmenistan", value: "turkmenistan", flag: "🇹🇲", isActive: true },
  { countryId: 180, label: "Tuvalu", value: "tuvalu", flag: "🇹🇻", isActive: true },
  { countryId: 181, label: "Uganda", value: "uganda", flag: "🇺🇬", isActive: true },
  { countryId: 182, label: "Ukraine", value: "ukraine", flag: "🇺🇦", isActive: true },
  { countryId: 183, label: "United Arab Emirates", value: "uae", flag: "🇦🇪", isActive: true },
  { countryId: 184, label: "United Kingdom", value: "uk", flag: "🇬🇧", isActive: true },
  { countryId: 185, label: "Uruguay", value: "uruguay", flag: "🇺🇾", isActive: true },
  { countryId: 186, label: "Uzbekistan", value: "uzbekistan", flag: "🇺🇿", isActive: true },
  { countryId: 187, label: "Vanuatu", value: "vanuatu", flag: "🇻🇺", isActive: true },
  { countryId: 188, label: "Vatican City", value: "vatican_city", flag: "🇻🇦", isActive: true },
  { countryId: 189, label: "Venezuela", value: "venezuela", flag: "🇻🇪", isActive: true },
  { countryId: 190, label: "Vietnam", value: "vietnam", flag: "🇻🇳", isActive: true },
  { countryId: 191, label: "Yemen", value: "yemen", flag: "🇾🇪", isActive: true },
  { countryId: 192, label: "Zambia", value: "zambia", flag: "🇿🇲", isActive: true },
  { countryId: 193, label: "Zimbabwe", value: "zimbabwe", flag: "🇿🇼", isActive: true }
];

// Educational Status data
const EDUCATIONAL_STATUS_DATA = [
  { statusId: 1, label: "High School", value: "high_school", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 2, label: "Some College", value: "some_college", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 3, label: "Associate Degree", value: "associate_degree", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 4, label: "Bachelor's Degree", value: "bachelors_degree", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 5, label: "Post-Baccalaureate Program", value: "post_baccalaureate", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 6, label: "Master's Degree", value: "masters_degree", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 7, label: "Doctoral Degree (PhD)", value: "doctoral_degree", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 8, label: "Medical Student (MD/DO)", value: "medical_student", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 9, label: "International Medical Graduate (IMG)", value: "img", requiresSpecialty: false, specialtyType: null, isActive: true },
  { statusId: 10, label: "Resident Physician", value: "resident_physician", requiresSpecialty: true, specialtyType: "resident", isActive: true },
  { statusId: 11, label: "Practicing Physician", value: "practicing_physician", requiresSpecialty: true, specialtyType: "physician", isActive: true },
  { statusId: 12, label: "Other Healthcare Professional", value: "other_healthcare", requiresSpecialty: true, specialtyType: "healthcare", isActive: true },
  { statusId: 13, label: "Other", value: "other_education", requiresSpecialty: false, specialtyType: null, isActive: true }
];

// Specialty data
const SPECIALTY_DATA = [
  // Physician Specialties
  { specialtyId: 1, label: "Anesthesiology", value: "anesthesiology", category: "physician", isActive: true },
  { specialtyId: 2, label: "Dermatology", value: "dermatology", category: "physician", isActive: true },
  { specialtyId: 3, label: "Emergency Medicine", value: "emergency_medicine", category: "physician", isActive: true },
  { specialtyId: 4, label: "Family Medicine", value: "family_medicine", category: "physician", isActive: true },
  { specialtyId: 5, label: "Internal Medicine", value: "internal_medicine", category: "physician", isActive: true },
  { specialtyId: 6, label: "Neurology", value: "neurology", category: "physician", isActive: true },
  { specialtyId: 7, label: "Neurosurgery", value: "neurosurgery", category: "physician", isActive: true },
  { specialtyId: 8, label: "Obstetrics & Gynecology", value: "obstetrics_gynecology", category: "physician", isActive: true },
  { specialtyId: 9, label: "Ophthalmology", value: "ophthalmology", category: "physician", isActive: true },
  { specialtyId: 10, label: "Orthopedic Surgery", value: "orthopedic_surgery", category: "physician", isActive: true },
  { specialtyId: 11, label: "Otolaryngology (ENT)", value: "otolaryngology", category: "physician", isActive: true },
  { specialtyId: 12, label: "Pathology", value: "pathology", category: "physician", isActive: true },
  { specialtyId: 13, label: "Pediatrics", value: "pediatrics", category: "physician", isActive: true },
  { specialtyId: 14, label: "Physical Medicine & Rehabilitation (PM&R)", value: "pmr", category: "physician", isActive: true },
  { specialtyId: 15, label: "Plastic Surgery", value: "plastic_surgery", category: "physician", isActive: true },
  { specialtyId: 16, label: "Psychiatry", value: "psychiatry", category: "physician", isActive: true },
  { specialtyId: 17, label: "Radiation Oncology", value: "radiation_oncology", category: "physician", isActive: true },
  { specialtyId: 18, label: "Radiology (Diagnostic)", value: "radiology", category: "physician", isActive: true },
  { specialtyId: 19, label: "Surgery (General)", value: "general_surgery", category: "physician", isActive: true },
  { specialtyId: 20, label: "Thoracic Surgery", value: "thoracic_surgery", category: "physician", isActive: true },
  { specialtyId: 21, label: "Urology", value: "urology", category: "physician", isActive: true },
  { specialtyId: 22, label: "Vascular Surgery", value: "vascular_surgery", category: "physician", isActive: true },
  { specialtyId: 23, label: "Other", value: "other_physician", category: "physician", isActive: true },
  
  // Resident Specialties
  { specialtyId: 24, label: "Anesthesiology", value: "anesthesiology", category: "resident", isActive: true },
  { specialtyId: 25, label: "Dermatology", value: "dermatology", category: "resident", isActive: true },
  { specialtyId: 26, label: "Emergency Medicine", value: "emergency_medicine", category: "resident", isActive: true },
  { specialtyId: 27, label: "Family Medicine", value: "family_medicine", category: "resident", isActive: true },
  { specialtyId: 28, label: "Internal Medicine", value: "internal_medicine", category: "resident", isActive: true },
  { specialtyId: 29, label: "Neurology", value: "neurology", category: "resident", isActive: true },
  { specialtyId: 30, label: "Neurosurgery", value: "neurosurgery", category: "resident", isActive: true },
  { specialtyId: 31, label: "Obstetrics & Gynecology", value: "obstetrics_gynecology", category: "resident", isActive: true },
  { specialtyId: 32, label: "Ophthalmology", value: "ophthalmology", category: "resident", isActive: true },
  { specialtyId: 33, label: "Orthopedic Surgery", value: "orthopedic_surgery", category: "resident", isActive: true },
  { specialtyId: 34, label: "Otolaryngology (ENT)", value: "otolaryngology", category: "resident", isActive: true },
  { specialtyId: 35, label: "Pathology", value: "pathology", category: "resident", isActive: true },
  { specialtyId: 36, label: "Pediatrics", value: "pediatrics", category: "resident", isActive: true },
  { specialtyId: 37, label: "Physical Medicine & Rehabilitation (PM&R)", value: "pmr", category: "resident", isActive: true },
  { specialtyId: 38, label: "Plastic Surgery", value: "plastic_surgery", category: "resident", isActive: true },
  { specialtyId: 39, label: "Psychiatry", value: "psychiatry", category: "resident", isActive: true },
  { specialtyId: 40, label: "Radiation Oncology", value: "radiation_oncology", category: "resident", isActive: true },
  { specialtyId: 41, label: "Radiology (Diagnostic)", value: "radiology", category: "resident", isActive: true },
  { specialtyId: 42, label: "Surgery (General)", value: "general_surgery", category: "resident", isActive: true },
  { specialtyId: 43, label: "Thoracic Surgery", value: "thoracic_surgery", category: "resident", isActive: true },
  { specialtyId: 44, label: "Urology", value: "urology", category: "resident", isActive: true },
  { specialtyId: 45, label: "Vascular Surgery", value: "vascular_surgery", category: "resident", isActive: true },
  { specialtyId: 46, label: "Other", value: "other_resident_physician", category: "resident", isActive: true },
  
  // Healthcare Professional Specialties
  { specialtyId: 47, label: "Physician Assistant (PA)", value: "physician_assistant", category: "healthcare", isActive: true },
  { specialtyId: 48, label: "Nurse Practitioner (NP)", value: "nurse_practitioner", category: "healthcare", isActive: true },
  { specialtyId: 49, label: "Registered Nurse (RN)", value: "registered_nurse", category: "healthcare", isActive: true },
  { specialtyId: 50, label: "Licensed Practical Nurse (LPN)", value: "licensed_practical_nurse", category: "healthcare", isActive: true },
  { specialtyId: 51, label: "Medical Assistant (MA)", value: "medical_assistant", category: "healthcare", isActive: true },
  { specialtyId: 52, label: "Pharmacist", value: "pharmacist", category: "healthcare", isActive: true },
  { specialtyId: 53, label: "Pharmacy Technician", value: "pharmacy_technician", category: "healthcare", isActive: true },
  { specialtyId: 54, label: "Physical Therapist (PT)", value: "physical_therapist", category: "healthcare", isActive: true },
  { specialtyId: 55, label: "Occupational Therapist (OT)", value: "occupational_therapist", category: "healthcare", isActive: true },
  { specialtyId: 56, label: "Speech-Language Pathologist (SLP)", value: "speech_language_pathologist", category: "healthcare", isActive: true },
  { specialtyId: 57, label: "Respiratory Therapist (RT)", value: "respiratory_therapist", category: "healthcare", isActive: true },
  { specialtyId: 58, label: "Radiologic Technologist", value: "radiologic_technologist", category: "healthcare", isActive: true },
  { specialtyId: 59, label: "Sonographer", value: "sonographer", category: "healthcare", isActive: true },
  { specialtyId: 60, label: "Laboratory Technologist / Technician", value: "laboratory_technologist", category: "healthcare", isActive: true },
  { specialtyId: 61, label: "Dietitian / Nutritionist", value: "dietitian_nutritionist", category: "healthcare", isActive: true },
  { specialtyId: 62, label: "Psychologist", value: "psychologist", category: "healthcare", isActive: true },
  { specialtyId: 63, label: "Social Worker", value: "social_worker", category: "healthcare", isActive: true },
  { specialtyId: 64, label: "Emergency Medical Technician (EMT) / Paramedic", value: "emt_paramedic", category: "healthcare", isActive: true },
  { specialtyId: 65, label: "Chiropractor", value: "chiropractor", category: "healthcare", isActive: true },
  { specialtyId: 66, label: "Dentist", value: "dentist", category: "healthcare", isActive: true },
  { specialtyId: 67, label: "Dental Hygienist", value: "dental_hygienist", category: "healthcare", isActive: true },
  { specialtyId: 68, label: "Optometrist", value: "optometrist", category: "healthcare", isActive: true },
  { specialtyId: 69, label: "Other", value: "other_healthcare_professional", category: "healthcare", isActive: true }
];

// Main function to insert data
async function insertData() {
  const client = new MongoClient(uri);
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    const db = client.db(dbName);
    
    // Drop existing collections (optional - remove if you want to keep existing data)
    console.log("🧹 Dropping existing collections...");
    try {
      await db.collection('countries').drop();
    } catch (e) {
      console.log("Countries collection doesn't exist yet");
    }
    try {
      await db.collection('educationalstatuses').drop();
    } catch (e) {
      console.log("Educational statuses collection doesn't exist yet");
    }
    try {
      await db.collection('specialties').drop();
    } catch (e) {
      console.log("Specialties collection doesn't exist yet");
    }
    
    // Insert Countries
    console.log("🌍 Inserting countries...");
    const countriesResult = await db.collection('countries').insertMany(COUNTRY_DATA);
    console.log(`✅ Inserted ${countriesResult.insertedCount} countries`);
    
    // Insert Educational Statuses
    console.log("🎓 Inserting educational statuses...");
    const educationResult = await db.collection('educationalstatuses').insertMany(EDUCATIONAL_STATUS_DATA);
    console.log(`✅ Inserted ${educationResult.insertedCount} educational statuses`);
    
    // Insert Specialties
    console.log("⚕️ Inserting specialties...");
    const specialtiesResult = await db.collection('specialties').insertMany(SPECIALTY_DATA);
    console.log(`✅ Inserted ${specialtiesResult.insertedCount} specialties`);
    
    // Create indexes
    console.log("📑 Creating indexes...");
    await db.collection('countries').createIndex({ label: "text" });
    await db.collection('countries').createIndex({ value: 1 });
    await db.collection('countries').createIndex({ countryId: 1 });
    
    await db.collection('educationalstatuses').createIndex({ label: "text" });
    await db.collection('educationalstatuses').createIndex({ value: 1 });
    await db.collection('educationalstatuses').createIndex({ statusId: 1 });
    
    await db.collection('specialties').createIndex({ label: "text" });
    await db.collection('specialties').createIndex({ value: 1 });
    await db.collection('specialties').createIndex({ category: 1 });
    await db.collection('specialties').createIndex({ specialtyId: 1 });
    
    console.log("✅ Indexes created successfully");
    
    // Verify the data
    const countriesCount = await db.collection('countries').countDocuments();
    const educationCount = await db.collection('educationalstatuses').countDocuments();
    const specialtiesCount = await db.collection('specialties').countDocuments();
    
    console.log("\n📊 Database Statistics:");
    console.log(`Countries: ${countriesCount}`);
    console.log(`Educational Statuses: ${educationCount}`);
    console.log(`Specialties: ${specialtiesCount}`);
    
    console.log("\n🎉 All data inserted successfully!");
    
  } catch (error) {
    console.error("❌ Error inserting data:", error);
  } finally {
    // Close connection
    await client.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run the insertion
insertData();