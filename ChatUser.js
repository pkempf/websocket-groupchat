/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");
const axios = require("axios");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** make chat: store connection-device, rooom */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** get a dad joke from icanhazdadjoke.com */

  static async getJoke() {
    try {
      let jokeRequest = await axios.get("https://icanhazdadjoke.com", {
        headers: { Accept: "application/json" },
      });
      return jokeRequest.data.joke;
    } catch (e) {
      return "Error: couldn't get a joke!";
    }
  }

  /** send msgs to this client using underlying connection-send-function */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** handle joining: add to room members, announce join */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** handle a chat: broadcast to room. */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }

  /** handle getting a joke: broadcast only to this user */

  async handleJoke() {
    let joke = await ChatUser.getJoke();
    this.send(
      JSON.stringify({
        name: "Server",
        type: "chat",
        text: joke,
      })
    );
  }

  /** handle a member request: broadcast only to this user */

  handleMemberRequest() {
    let memberList = Array.from(this.room.members)
      .map((m) => m.name)
      .join(", ");
    this.send(
      JSON.stringify({
        name: "Server",
        type: "chat",
        text: "In this room: " + memberList,
      })
    );
  }

  /** Handle messages from client:
   *
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * - {type: "get-joke"}             : joke
   * - {type: "get-members"}          : members
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === "join") this.handleJoin(msg.name);
    else if (msg.type === "chat") this.handleChat(msg.text);
    else if (msg.type === "get-joke") this.handleJoke();
    else if (msg.type === "get-members") this.handleMemberRequest();
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left "${this.room.name}".`,
    });
  }
}

module.exports = ChatUser;
