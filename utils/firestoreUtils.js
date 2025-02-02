import { getFirestore, collection, increment, query, orderBy, limit, addDoc, getDoc, updateDoc, doc, deleteDoc } from "@firebase/firestore";
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider} from "firebase/auth"
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "@firebase/storage";
import firebaseApp from "./firebaseConfig";



const db = getFirestore(firebaseApp);
//firebase storage is for storing large files such as images-- used for posts
const storage = getStorage(firebaseApp);
const auth = getAuth(firebaseApp);

//POST- add data
export const addData = async (collectionName, data) => {
    try { 
        const docRef = await addDoc(collection(db, collectionName), data);
        console.log("Document written, ID: ", docRef.id);
    } catch(e) {
        console.error("ERROR adding data: ", e);
    }
};

//~~~ add post ~~~//
export const addPost = async (imageFile, caption) => {
    try {
        //need to set up authentication first
        const user = auth.currentUser;
        if (!user) throw new Error("failed to authenticate user");

        const userId = user.uid;
        const username = user.displayName

        //need to upload image to firebase storage
        const storageRef = ref(storage, 'posts/${userId}/${imageFile.name}');
        await uploadBytes(storageRef, imageFile);

        const imageURL = await getDownloadURL(storageRef);


        // create post schema
        const postData = {
            userId: userId, 
            username: username, 
            imageURL: imageURL, 
            caption: caption, 
            createdAt: new Date().toISOString(),
            likes: 0,
        };

        //add new post to database
        const docRef = await addDoc(collection(db, "posts"), postData);
        console.log("Post created with ID: ", docRef.id);

        return { success: true, message: "your post has been uploaded", postId: docRef.id};
    } catch (e) {
        console.error("ERROR failed to add post: ", e);
        return { success: false, message: e.message};
    }
};






//GET- get data
export const getData = async (collectionName) => {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const data = [];
        querySnapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        return data;
    } catch(e) {
        console.error("ERROR: failed to get data: ", e);
    }
};

//~~~populate page with RANDOM posts~~~//
export const getRecentPosts = async () => {
    try {
        const postsRef = collection(db, "posts");
        const recentPostsQuery = query(postsRef, orderBy("timestamp", "desc"), limit(30));

        const querySnapshot = await getDocs(recentPostsQuery);
        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data()});
        });

        console.log("successfully fetched 30 most recent posts");
        return { success: true, posts};
    } catch (e) {
        console.error("ERROR failed to fetch posts: ", e);
        return { success: false, message: e.message}
    }
};






//PATCH- update data
export const updateData = async (collectionName, docId, updateData) => {
    try {
        const docRef = doc(db, collectionName, docId);
        updateDoc(docRef, updateData);
        console.log("data upadate successful, id: ", docId);
    } catch (e) {
        console.error("ERROR update failed: ", e);
    }
};

//~~~update number of likes~~~//
export const incrementLikes = async (postId) => {
    try {
        const postRef = doc(db, "posts", postId);

        await updateDoc(postRef, {
            likes: increment(1)
        });

        console.log("post liked");
        return {success: true, message: "post liked"};
    } catch (e) {
        console.error("ERROR unable to like post: ", e);
        return { success: false, message: e.message};
    }
};

//~~~updateUserProfile~~~//
export const updateUserProfile = async (userId, newUserName, newEmail, newPassword, currentPassword) => {
    try {
        const user = auth.currentUser;
        if(!user) {
            throw new Error("User does not exist");
        }

        if (currentPassword) {
            const credential = EmailAuthProvider.credential(user.email, user.currentPassword);
            await reauthenticateWithCredential(user, credential);
        }

        if (newUserName) {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                username: newUserName
            });
            console.log("user name updated");
        }

        if (newEmail && newEmail !== user.email) {
            await updateEmail(user, newEmail);
            console.log("email updated");
        }

        if (newPassword && newPassword !== user.currentPassword) {
            await updatePassword(user, newPassword);
            console.log("password updated");
        }

        return { success: true, message: "profile updated"};
    } catch (e) {
        console.error("ERROR unable to update profile: ", e);
        return {success: false, message: error.message};
    }
};








//DELETE- delete data
export const deleteData = async (collectionName, docId) => {
    try {
        await deleteDoc(doc(db, collectionName, docID));
        console.log("data deleted successfully, id: ", docId);
    } catch (e) {
        console.error("ERROR failed to delete data: ", e);
    }
};

//~~deleting a post~~//
export const deletePost = async (postId, imageUrl) => {
    try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
        console.log("successfully deleted image");

        await deleteDoc(doc(db, "posts", postId));
        console.log("successfully deleted post");
        return {sucess: true, message: "post fully deleted"};
    } catch (e) {
        console.error("error deleting post: ", error);
        return {success: false, message: e.message };
    }
};