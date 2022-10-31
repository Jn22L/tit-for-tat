const SocketIO = require("socket.io");
module.exports = (server) => {
  //const io = SocketIO(server);
  const io = SocketIO(server, { path: "/socket.io/tit-for-tat/" });
  //let playerNoIdx = 0;

  io.on("connection", (socket) => {
    console.log("connection", socket.data);

    /**
     * on join user
     * @param tempLoginId : temp id
     * @return
     */
    socket.on("join user", (tempLoginId) => {
      console.log("join user", tempLoginId);
      joinUserProcess(tempLoginId);
    });

    /**
     * on enter game
     * @param nickName : login nickName
     * @return
     */
    socket.on("enter game", (nickName) => {
      console.log("enter game", nickName);
      enterGameProcess(nickName);
    });

    /**
     * 로그인 처리 : 아이디 중복체크 후 없으면 로그인 처리
     * @param tempLoginId : 입력한 로그인 아이디
     * @return
     */
    async function joinUserProcess(tempLoginId) {
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
      //socket.data.playerNo = ++playerNoIdx;
      socket.data.playerNo = 999; // login 성공시, 관전(999) 으로 참여

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        if (_socket.data.playerNo > 0) {
          loginUserList.push({ nickName: _socket.data.nickName, playerNo: _socket.data.playerNo });
        }
      }
      io.emit("join user", { isLoginOk: true, errMsg: "LOGIN_OK", nickName: socket.data.nickName, playerNo: socket.data.playerNo, allUserCount: io.of("/").sockets.size, loginUserList }); // 중복없음
    }

    /**
     * 게임참여 처리 : 선착순으로 playerNo 1,2번 순번 부여
     * @param nickName
     * @return
     */
    async function enterGameProcess(nickName) {
      const sockets = await io.fetchSockets();
      let isPlayer = false; // 선수여부

      // 1,2번이 비었으면 선수 등록 , 아니면 관전(999)
      let tempP1 = sockets.filter((so) => so.data.playerNo === 1);
      let tempP2 = sockets.filter((so) => so.data.playerNo === 2);
      if (tempP1.length === 0) {
        isPlayer = true;
        socket.data.playerNo = 1;
      } else if (tempP2.length === 0) {
        isPlayer = true;
        socket.data.playerNo = 2;
      } else if (tempP2.length === 0) {
        isPlayer = false;
        socket.data.playerNo = 999;
      }

      // 로그인 유저목록
      const loginUserList = [];
      for (const _socket of sockets) {
        if (_socket.data.playerNo > 0) {
          loginUserList.push({ nickName: _socket.data.nickName, playerNo: _socket.data.playerNo });
        }
      }

      io.emit("enter game", { isPlayer, nickName: socket.data.nickName, playerNo: socket.data.playerNo, loginUserList });
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
