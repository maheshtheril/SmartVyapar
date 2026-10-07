const Jimp = require('jimp');
async function crop() {
  const image = await Jimp.read('C:\\Users\\dell\\.gemini\\antigravity\\brain\\a3cc0e70-95a9-4ea3-a2dc-5e7fc7ebb947\\brothers_automobile_logo_1791330628464.jpg');
  // Crop the bottom part where the text is.
  // The image is 1024x1024. The car and B logo are roughly in the top 2/3.
  image.crop(0, 0, 1024, 550);
  await image.writeAsync('C:\\Users\\dell\\OneDrive\\Desktop\\Brothers_Automobile_Logo_Cropped.jpg');
}
crop();
