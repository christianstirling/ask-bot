/**
 * RAG Prompt Assembly
 *
 * takes in { question, history, sources }
 * builds 'context block'
 * calls chat function with a message that includes:
 *      a. system instructions
 *      b. context block
 *      c. user question
 *
 *      * only change to the chat function is that it should be able to take in
 *      a special RAG message which includes the context block
 *
 */
