const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');





  const OpenAI = require("openai");


  const { Pinecone } = require("@pinecone-database/pinecone");
  const uuid = require('uuid').v4; 
  
  const pc = new Pinecone({ apiKey: '' });
  const openai = new OpenAI({
      apiKey: '', // This is the default and can be omitted
  });
  
  const AZURE_STORAGE_CONNECTION_STRING = '';




async function readImage(link) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `describe the content of the image in detail, and explain the context. minimum 300 words` },
          {
            type: "image_url",
            image_url: {
              "url": link,
            },
          },
        ],
      },
    ],
  });
  console.log(response);
  console.log(response.choices[0].message.content);

  return response.choices[0].message.content
}

  
 
  
  
  const createEmbedding = async (text) => {
      const embedding = await openai.embeddings.create({
          model: "text-embedding-3-large",
          input: text,
          encoding_format: "float",
      });
  
      return embedding.data[0].embedding;
  };
  
  
  
  const indexName = "business-news"
  
  const index = pc.index(indexName);
  
  const upsertIntoPinecone=async (link,source)=>{
      const imageContent= await readImage(link)
      const embedding=await createEmbedding(JSON.stringify(imageContent))
      console.log(embedding)
  
      const insertResult=await index.namespace("images").upsert([
          {
            "id": uuid(), 
            "values": embedding,
            "metadata": {
                content:imageContent,
                imageLink:link,
                source
            }
          }
        ]);
  
      console.log(insertResult)
  
  
  }
  



async function uploadImageToBlob(imagePath) {
    // Create the BlobServiceClient object which will be used to create a container client
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

    // Get a reference to a container
    const containerName = 'images'; // Name of the container
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create the container if it does not exist
    await containerClient.createIfNotExists();

    // Get a block blob client
    const blobName = path.basename(imagePath);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload data to the blob
    const data = fs.readFileSync(imagePath);
    await blockBlobClient.uploadData(data);

    // Get the URL of the uploaded image
    const imageUrl = blockBlobClient.url;
    return imageUrl;
}

const imagePath = ''; // Replace with the path to your image

uploadImageToBlob(imagePath)
    .then(imageUrl => {
        console.log(`Image uploaded to Azure Blob Storage. URL: ${imageUrl}`);

        upsertIntoPinecone(imageUrl,'economist')

    })
    .catch(error => {
        console.error('Error uploading image to Azure Blob Storage:', error.message);
    });

  
  
 