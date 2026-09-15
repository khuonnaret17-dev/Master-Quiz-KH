const src = "https://drive.google.com/file/d/123";
console.log(src.split('/file/d/')[1]?.split('/')[0]);

const src2 = "https://drive.google.com/something";
console.log(src2.split('/file/d/')[1]?.split('/')[0]);
