const SocketIO = require("socket.io");
module.exports = (server) => {
  const io = SocketIO(server);

  let playerNoIdx = 0;

  io.on("connection", (socket) => {
    console.log("connection", socket.data);

    /**
     * on join user
     * @param tempLoginId : 입력한 로그인 아이디
     * @return
     */
    socket.on("join user", (tempLoginId) => {
      console.log("join user", tempLoginId);
      joinProcess(tempLoginId);
    });

    /**
     * 로그인 처리 : 아이디 중복체크 후 없으면 로그인 처리
     * @param tempLoginId : 입력한 로그인 아이디
     * @return
     */
    async function joinProcess(tempLoginId) {
      const sockets = await io.fetchSockets();

      // 닉네임 중복체크
      for (const _socket of sockets) {
        if (tempLoginId === _socket.data.nickName) {
          io.emit("join user", { isLoginOk: false, errMsg: "DUP_LOGIN_ID", nickName: tempLoginId, playerNo: 0 }); // 중복발생시
          return;
        }
      }

      // 중복없을때
      socket.data.nickName = tempLoginId;
      socket.data.playerNo = ++playerNoIdx;
      io.emit("join user", { isLoginOk: true, errMsg: "LOGIN_OK", nickName: socket.data.nickName, playerNo: socket.data.playerNo }); // 중복없음

      // 현재 로그인 된 유저목록 - debug 용 - 확인후 주석처리 할것
      for (const _socket of sockets) {
        console.log("현재 로그인 유저목록:", _socket.data);
      }
    }

    socket.on("choice", (msg) => {
      console.log("choice", msg);
      io.emit("choice", msg);
    });

    socket.on("next round", (msg) => {
      io.emit("next round", msg);
    });

    socket.on("game over", (msg) => {
      io.emit("game over", msg);
    });

    socket.on("disconnect", () => {
      console.log("disconnnect", socket.data);
      socket.broadcast.emit("user logout", socket.data);
    });
  });
};
