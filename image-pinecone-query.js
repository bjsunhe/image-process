const fs=require('fs')
const OpenAI = require("openai");


const { Pinecone } = require("@pinecone-database/pinecone");
const uuid = require('uuid').v4; 

const pc = new Pinecone({ apiKey: '' });
const openai = new OpenAI({
    apiKey: '', // This is the default and can be omitted
});




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


const queryPinecone=async (text)=>{
    const question=await createEmbedding(text)

    const queryResponse = await index.namespace("images").query({
        topK: 1,
        vector: question,
        // includeValues: true
        includeMetadata: true
      });

    console.log(queryResponse)
    return queryResponse
}



// (async () => {
//     const result = await queryPinecone("how many items whoes stroke is 10 mm");
//     console.log(result);
// })();

  

  


const answerQuestions=async (question)=>{
    const answers=await queryPinecone(question)
    const messages=[
        {"role": "system", "content": "You are a helpful assistant to answer questions based on the context I give to you.  and show the image based on the imageLink"},
        {"role": "user", "content": `question: ${question}`},
        {"role": "user", "content": `context: ${answers.matches.map(a=>JSON.stringify(a.metadata))}`}
    ]

    console.log(messages)
    const completion = await openai.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
      });

    console.log(completion)
    
    return completion.choices[0]
}

const answer=async (question)=>{
    const answers=await answerQuestions(question)
    return answers
}


(async () => {
    const result = await answer("how much google spend on the buy of youtube");
    console.log(result);


    fs.writeFile('1.md', result.message.content, (err) => {
        if (err) {
          console.error('Error writing to file', err);
        } else {
          console.log('Markdown file created successfully.');
        }
      });
})();

