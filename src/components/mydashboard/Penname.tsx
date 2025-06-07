// src/components/mydashboard/Penname.tsx
import React, { useState } from "react";

const pennames = [
  {
    id: 1,
    name: "นามปากกา A",
    avatarUrl: "/avatar-1.jpg",
    novels: [
      {
        id: 1,
        coverUrl: "/novel-cover-1.jpg",
        title: "ราตรีแห่งดวงดาว",
        author: "ผู้แต่ง A",
        views: 1205,
        followers: 342,
        comments: 89,
        episodes: 15,
        summary:
          "เรื่องราวความรักใต้แสงดาวของหญิงสาวผู้มีความฝันและหนุ่มนักดาราศาสตร์ ที่โคจรมาพบกันในค่ำคืนที่ดวงดาวเต็มฟ้า",
      },
      {
        id: 2,
        coverUrl: "/novel-cover-2.jpg",
        title: "สายลมรักใต้แสงจันทร์",
        author: "ผู้แต่ง A",
        views: 890,
        followers: 256,
        comments: 45,
        episodes: 8,
        summary:
          "ความรักที่พัดผ่านมาพร้อมสายลมยามค่ำคืน ระหว่างสาวน้อยเจ้าของร้านดอกไม้และนักดนตรีข้างถนน",
      },
      {
        id: 3,
        coverUrl: "/novel-cover-1.jpg",
        title: "ราตรีแห่งดวงดาว",
        author: "ผู้แต่ง A",
        views: 1205,
        followers: 342,
        comments: 89,
        episodes: 15,
        summary:
          "เรื่องราวความรักใต้แสงดาวของหญิงสาวผู้มีความฝันและหนุ่มนักดาราศาสตร์ ที่โคจรมาพบกันในค่ำคืนที่ดวงดาวเต็มฟ้า",
      },
      {
        id: 4,
        coverUrl: "/novel-cover-2.jpg",
        title: "สายลมรักใต้แสงจันทร์",
        author: "ผู้แต่ง A",
        views: 890,
        followers: 256,
        comments: 45,
        episodes: 8,
        summary:
          "ความรักที่พัดผ่านมาพร้อมสายลมยามค่ำคืน ระหว่างสาวน้อยเจ้าของร้านดอกไม้และนักดนตรีข้างถนน",
      },
      {
        id: 5,
        coverUrl: "/novel-cover-1.jpg",
        title: "ราตรีแห่งดวงดาว",
        author: "ผู้แต่ง A",
        views: 1205,
        followers: 342,
        comments: 89,
        episodes: 15,
        summary:
          "เรื่องราวความรักใต้แสงดาวของหญิงสาวผู้มีความฝันและหนุ่มนักดาราศาสตร์ ที่โคจรมาพบกันในค่ำคืนที่ดวงดาวเต็มฟ้า",
      },
      {
        id: 6,
        coverUrl: "/novel-cover-2.jpg",
        title: "สายลมรักใต้แสงจันทร์",
        author: "ผู้แต่ง A",
        views: 890,
        followers: 256,
        comments: 45,
        episodes: 8,
        summary:
          "ความรักที่พัดผ่านมาพร้อมสายลมยามค่ำคืน ระหว่างสาวน้อยเจ้าของร้านดอกไม้และนักดนตรีข้างถนน",
      },
    ],
  },
  {
    id: 2,
    name: "นามปากกา B",
    avatarUrl: "/avatar-2.jpg",
    novels: [
      {
        id: 7,
        coverUrl: "/novel-cover-3.jpg",
        title: "เงาเวทย์มนตรา",
        author: "ผู้แต่ง B",
        views: 2150,
        followers: 567,
        comments: 123,
        episodes: 25,
        summary:
          "การผจญภัยในโลกแห่งเวทมนตร์ของนักเรียนโรงเรียนเวทมนตร์ผู้มีพรสวรรค์พิเศษ กับภารกิจปกป้องโลกจากภัยมืด",
      },
      {
        id: 8,
        coverUrl: "/novel-cover-4.jpg",
        title: "พันธนาการรัก",
        author: "ผู้แต่ง B",
        views: 1780,
        followers: 432,
        comments: 98,
        episodes: 18,
        summary:
          "ความรักที่ถูกผูกมัดด้วยพันธนาการแห่งโชคชะตา ระหว่างทายาทตระกูลดังและสาวสามัญธรรมดา",
      },
      {
        id: 9,
        coverUrl: "/novel-cover-1.jpg",
        title: "ราตรีแห่งดวงดาว",
        author: "ผู้แต่ง B",
        views: 1205,
        followers: 342,
        comments: 89,
        episodes: 15,
        summary:
          "เรื่องราวความรักใต้แสงดาวของหญิงสาวผู้มีความฝันและหนุ่มนักดาราศาสตร์ ที่โคจรมาพบกันในค่ำคืนที่ดวงดาวเต็มฟ้า",
      },
      {
        id: 10,
        coverUrl: "/novel-cover-2.jpg",
        title: "สายลมรักใต้แสงจันทร์",
        author: "ผู้แต่ง B",
        views: 890,
        followers: 256,
        comments: 45,
        episodes: 8,
        summary:
          "ความรักที่พัดผ่านมาพร้อมสายลมยามค่ำคืน ระหว่างสาวน้อยเจ้าของร้านดอกไม้และนักดนตรีข้างถนน",
      },
    ],
  },
  {
    id: 3,
    name: "นามปากกา C",
    avatarUrl: "/avatar-3.jpg",
    novels: [
      {
        id: 11,
        coverUrl: "/novel-cover-5.jpg",
        title: "กาลครั้งหนึ่งในฝัน",
        author: "ผู้แต่ง C",
        views: 3200,
        followers: 890,
        comments: 234,
        episodes: 30,
        summary:
          "เมื่อความฝันและความจริงเริ่มเลือนลาง หญิงสาวผู้หลงเข้าไปในโลกแห่งความฝันต้องค้นหาทางกลับสู่โลกแห่งความเป็นจริง",
      },
      {
        id: 12,
        coverUrl: "/novel-cover-6.jpg",
        title: "บ่วงบุปผา",
        author: "ผู้แต่ง C",
        views: 2800,
        followers: 765,
        comments: 178,
        episodes: 22,
        summary:
          "ดอกไม้แห่งรักที่เบ่งบานในสวนลับ ระหว่างเจ้าหญิงผู้ถูกกักขังและคนสวนหนุ่มผู้ลึกลับ",
      },
    ],
  },
  {
    id: 4,
    name: "นามปากกา D",
    avatarUrl: "/avatar-4.jpg",
    novels: [
      {
        id: 13,
        coverUrl: "/novel-cover-7.jpg",
        title: "มายาสีรุ้ง",
        author: "ผู้แต่ง D",
        views: 1670,
        followers: 445,
        comments: 87,
        episodes: 12,
        summary:
          "การเดินทางผจญภัยในโลกแห่งสีรุ้ง ของเด็กหญิงผู้มีพลังพิเศษในการมองเห็นสีแห่งจิตวิญญาณ",
      },
      {
        id: 14,
        coverUrl: "/novel-cover-8.jpg",
        title: "เส้นทางแห่งรัก",
        author: "ผู้แต่ง D",
        views: 1450,
        followers: 378,
        comments: 65,
        episodes: 10,
        summary:
          "การเดินทางค้นหาความรักแท้ของหญิงสาวผู้ผิดหวังในความรัก จนได้พบกับรักแท้ในที่ที่ไม่คาดคิด",
      },
      {
        id: 15,
        coverUrl: "/novel-cover-1.jpg",
        title: "ราตรีแห่งดวงดาว",
        author: "ผู้แต่ง D",
        views: 1205,
        followers: 342,
        comments: 89,
        episodes: 15,
        summary:
          "เรื่องราวความรักใต้แสงดาวของหญิงสาวผู้มีความฝันและหนุ่มนักดาราศาสตร์ ที่โคจรมาพบกันในค่ำคืนที่ดวงดาวเต็มฟ้า",
      },
      {
        id: 16,
        coverUrl: "/novel-cover-2.jpg",
        title: "สายลมรักใต้แสงจันทร์",
        author: "ผู้แต่ง D",
        views: 890,
        followers: 256,
        comments: 45,
        episodes: 8,
        summary:
          "ความรักที่พัดผ่านมาพร้อมสายลมยามค่ำคืน ระหว่างสาวน้อยเจ้าของร้านดอกไม้และนักดนตรีข้างถนน",
      },
      {
        id: 17,
        coverUrl: "/novel-cover-1.jpg",
        title: "ราตรีแห่งดวงดาว",
        author: "ผู้แต่ง D",
        views: 1205,
        followers: 342,
        comments: 89,
        episodes: 15,
        summary:
          "เรื่องราวความรักใต้แสงดาวของหญิงสาวผู้มีความฝันและหนุ่มนักดาราศาสตร์ ที่โคจรมาพบกันในค่ำคืนที่ดวงดาวเต็มฟ้า",
      },
      {
        id: 18,
        coverUrl: "/novel-cover-2.jpg",
        title: "สายลมรักใต้แสงจันทร์",
        author: "ผู้แต่ง D",
        views: 890,
        followers: 256,
        comments: 45,
        episodes: 8,
        summary:
          "ความรักที่พัดผ่านมาพร้อมสายลมยามค่ำคืน ระหว่างสาวน้อยเจ้าของร้านดอกไม้และนักดนตรีข้างถนน",
      },
      {
        id: 19,
        coverUrl: "/novel-cover-1.jpg",
        title: "ราตรีแห่งดวงดาว",
        author: "ผู้แต่ง D",
        views: 1205,
        followers: 342,
        comments: 89,
        episodes: 15,
        summary:
          "เรื่องราวความรักใต้แสงดาวของหญิงสาวผู้มีความฝันและหนุ่มนักดาราศาสตร์ ที่โคจรมาพบกันในค่ำคืนที่ดวงดาวเต็มฟ้า",
      },
      {
        id: 20,
        coverUrl: "/novel-cover-2.jpg",
        title: "สายลมรักใต้แสงจันทร์",
        author: "ผู้แต่ง D",
        views: 890,
        followers: 256,
        comments: 45,
        episodes: 8,
        summary:
          "ความรักที่พัดผ่านมาพร้อมสายลมยามค่ำคืน ระหว่างสาวน้อยเจ้าของร้านดอกไม้และนักดนตรีข้างถนน",
      },
    ],
  },
  {
    id: 5,
    name: "นามปากกา E",
    avatarUrl: "/avatar-5.jpg",
    novels: [
      {
        id: 21,
        coverUrl: "/novel-cover-9.jpg",
        title: "ดวงใจในสายลม",
        author: "ผู้แต่ง E",
        views: 2340,
        followers: 654,
        comments: 156,
        episodes: 20,
        summary:
          "ความรักที่พัดพาดวงใจของหญิงสาวให้ล่องลอยไปตามสายลม จนได้พบกับรักแท้ที่ปลายทาง",
      },
      {
        id: 22,
        coverUrl: "/novel-cover-10.jpg",
        title: "รักในม่านหมอก",
        author: "ผู้แต่ง E", 
        views: 1980,
        followers: 534,
        comments: 112,
        episodes: 16,
        summary:
          "เรื่องราวความรักที่ซ่อนตัวอยู่ในม่านหมอก ระหว่างหญิงสาวผู้หนีความวุ่นวายในเมืองและชายหนุ่มปริศนาบนภูเขา",
      },
    ],
  },
];

export const Penname = () => {
  const [selectedPennameId, setSelectedPennameId] = useState<number | null>(
    pennames[0].id
  );
  const [showAllPennames, setShowAllPennames] = useState(false);

  const selectedPenname = pennames.find((p) => p.id === selectedPennameId);
  const novels = selectedPenname ? selectedPenname.novels : [];

  // คำนวณสถิติรวมทั้งหมด
  const allNovels = pennames.flatMap((p) => p.novels);
  const totalAllNovels = allNovels.length;
  const totalAllViews = allNovels.reduce((sum, n) => sum + n.views, 0);
  const totalAllFollowers = allNovels.reduce((sum, n) => sum + n.followers, 0);
  const totalAllComments = allNovels.reduce((sum, n) => sum + n.comments, 0);

  // สรุปสถิติรวมของนามปากกาที่เลือก
  const totalNovels = novels.length;
  const totalViews = novels.reduce((sum, n) => sum + n.views, 0);
  const totalFollowers = novels.reduce((sum, n) => sum + n.followers, 0);
  const totalComments = novels.reduce((sum, n) => sum + n.comments, 0);

  return (
    <div>
      {/* ปุ่มเลือกนามปากกา */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-300 py-4">
        <div className="flex items-center">
          <button
            className={`px-3 py-1 font-medium transition-colors ${
              showAllPennames
                ? "text-blue-600"
                : "text-gray-500 hover:text-blue-500"
            }`}
            onClick={() => {
              setShowAllPennames(true);
              setSelectedPennameId(null);
            }}
          >
            นามปากกา
          </button>
          <div className="h-5 w-px bg-gray-300 mx-2" />
          {pennames.map((pen, index) => (
            <React.Fragment key={pen.id}>
              <button
                className={`px-3 py-1 font-medium transition-colors ${
                  selectedPennameId === pen.id
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-blue-500"
                }`}
                onClick={() => {
                  setSelectedPennameId(pen.id);
                  setShowAllPennames(false);
                }}
              >
                {pen.name}
              </button>
              {index < pennames.length - 1 && (
                <div className="h-5 w-px bg-gray-300 mx-2" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* สรุปสถิติรวม */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-center">
          <div className="text-gray-500">
            งานเขียน {showAllPennames ? totalAllNovels : totalNovels} เรื่อง
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">
            อ่าน {showAllPennames ? totalAllViews : totalViews} คน
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">
            ติดตาม {showAllPennames ? totalAllFollowers : totalFollowers} คน
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">
            คอมเมนต์ {showAllPennames ? totalAllComments : totalComments} คน
          </div>
        </div>
      </div>

      {/* รายการนิยาย */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {(showAllPennames ? allNovels : novels).map((novel) => (
          <div
            key={novel.id}
            className="bg-white rounded-lg shadow p-4 flex flex-col border border-black"
          >
            <div className="flex items-start">
              <img
                src={novel.coverUrl}
                alt={novel.title}
                className="w-28 h-40 object-cover rounded mr-4"
              />
              <div className="flex-1">
                <div className="font-bold text-lg mb-1">{novel.title}</div>
                <div className="text-gray-500 mb-1">
                  ผู้แต่ง: {novel.author || "ชื่อผู้แต่ง"}
                </div>
                <div className="flex gap-4 text-sm text-gray-600 mb-2 pt-17">
                  <span>📖 {novel.episodes} ตอน</span>
                  <span>👁️ {novel.views} ยอดอ่านรวม</span>
                  <span>❤️ {novel.followers} หัวใจ</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-gray-700 text-sm">
              <p className="font-bold text-lg ">เรื่องย่อ</p>
              {novel.summary}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
