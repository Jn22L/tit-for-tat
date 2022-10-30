const SocketIO = require("socket.io");
module.exports = (server) => {
  const io = SocketIO(server);
  let playerNoMaxIdx = 0; // player 순번 (1,2 = 경기 참여, 3 부터 : 관전 )
  const roundStatus = { roundIdx: 0, user1Choice: "", user2Choice: "" }; // 현재 라운드 선택내역
  io.on("connection", (socket) => {
    console.log("connection");

    socket.on("join user", (msg) => {
      console.log("join user", msg);
      socket.data.nickName = msg;
      onJoinUser(msg);
    });

    // join 처리
    // TODO: nickName 중복체크 ???
    async function onJoinUser(joinUserNickName) {
      const sockets = await io.fetchSockets();
      const userList = [];
      for (const _socket of sockets) {
        // join 순서대로 순번 부여
        if (_socket.data.nickName && (_socket.data.playerNo === undefined || _socket.data.playerNo === 0)) {
          playerNoMaxIdx++;
          console.log("선수입장 순번부여", playerNoMaxIdx);
          _socket.data.playerNo = playerNoMaxIdx;
        }
        userList.push({ nickName: _socket.data.nickName, playerNo: _socket.data.playerNo });
      }
      console.log("userList", userList);
      io.emit("join user", { joinUserNickName, userList });
    }

    socket.on("choice", (msg) => {
      console.log("choice 1", msg);
      if (msg.roundIdx === roundStatus.roundIdx) {
        if (msg.playerNo === 1) {
          roundStatus.user1Choice = msg.choiceVal;
        }
        if (msg.playerNo === 2) {
          roundStatus.user2Choice = msg.choiceVal;
        }
      }

      console.log("choice 2", msg, roundStatus);
      io.emit("choice", { ...msg, user1Choice: roundStatus.user1Choice, user2Choice: roundStatus.user2Choice });

      if (roundStatus.user1Choice !== "" && roundStatus.user2Choice !== "") {
        roundStatus.roundIdx = roundStatus.roundIdx + 1;
        roundStatus.user1Choice = "";
        roundStatus.user2Choice = "";
      }
      console.log("choice 3", msg, roundStatus);
    });

    socket.on("next round", (round) => {
      io.emit("next round", round);
    });

    socket.on("game over", (round) => {
      io.emit("game over", round);
    });

    // 다시하기 ( 2번 호출되는 이유 ??? 일단 넘어가자 )
    socket.on("restart", (msg) => {
      console.log("restart", msg);
      io.emit("restart", msg);
    });

    // 나가기 ( 2번 호출되는 이유 ??? 일단 넘어가자 )
    socket.on("leave", (msg) => {
      console.log("leave", msg);
      onLeave(msg);
      //io.emit("leave", msg);
    });

    // 나가기 처리( 게임 초기화 )
    async function onLeave(msg) {
      const sockets = await io.fetchSockets();
      for (const _socket of sockets) {
        _socket.data.playerNo = 0;
        _socket.data.nickName = "";
        io.emit("leave", msg);
      }
      playerNoMaxIdx = 0;
      roundStatus.roundIdx = 0;
      roundStatus.user1Choice = "";
      roundStatus.user2Choice = "";
    }

    // 관전모드 전환
    socket.on("view mode", (msg) => {
      console.log("view mode", msg);
      io.emit("view mode", msg);
    });

    // 퇴장
    socket.on("disconnect", () => {
      console.log("disconnnect", socket.data);
      socket.broadcast.emit("user logout", socket.data);
    });
  });
};
