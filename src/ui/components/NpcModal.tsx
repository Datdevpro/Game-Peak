import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { ChibiAvatar } from './ChibiAvatar';
import { ModalWrapper } from './ModalWrapper';

const archetypesDialogs: Record<string, string[]> = {
  OfficeWorker: [
    'Tôi chuẩn bị vào ca làm việc tại Cửa Hàng Thời Trang. Một cốc cà phê thơm buổi sáng sẽ giúp tôi tỉnh táo cả ngày!',
    'Hôm nay giá hạt cà phê trên thị trường thế nào nhỉ? Quán nào giá mềm tôi sẽ ghé mua thường xuyên.',
    'Trời nắng ấm thế này, giờ giải lao đi dạo công viên Mầm là thích nhất.',
  ],
  Student: [
    'Tôi đang tiết kiệm tiền để mở một cửa hàng nhỏ sau này. Đọc sách tài chính ở công viên thật thú vị!',
    'Quán cà phê mở nhạc nhẹ nhàng và giá hợp lý là tụi mình sẽ ghé học bài ngay!',
    'Bạn đã thử đăng bán hàng trên chợ cư dân P2P chưa? Kiếm lời từ chênh lệch giá hay lắm đấy.',
  ],
  Shopper: [
    'Tôi vừa ghé Chợ Mầm Xanh mua ít sữa và trà. Chợ hôm nay đông đúc ghê!',
    'Nếu bạn có quán cà phê, nhớ giữ giá ổn định nhé, khách quen như tôi sẽ ủng hộ dài dài.',
    'Nghe nói có sự kiện khan hiếm hạt cà phê thì giá sẽ tăng vọt đấy!',
  ],
  Tourist: [
    'Thị trấn Mầm Xanh thật thanh bình và xinh đẹp! Không khí trong lành hơn hẳn thành phố lớn.',
    'Tôi đang tìm quán cà phê ngon nhất khu này. Bạn biết quán nào không?',
    'Người dân ở đây ai cũng tháo vát và năng động trong việc kinh doanh buôn bán.',
  ],
  Resident: [
    'Chào bạn hàng xóm mới! Chúc bạn kinh doanh phát đạt và xây dựng được cơ nghiệp lớn.',
    'Tôi hay gửi tiền nhàn rỗi vào Ngân Hàng Lá cho an toàn và tiện tích lũy.',
    'Thời tiết hôm nay thật dễ chịu, mọi người đổ ra đường tấp nập hẳn lên.',
  ],
};

export function NpcModal({ onClose }: { onClose: () => void }) {
  const world = useGameStore(s => s.world);
  const selected = useGameStore(s => s.selected);

  const npc = world.npcs.find(n => n.id === selected) || {
    id: 'npc-guest',
    name: 'Cư dân thân thiện',
    avatar: 0,
    archetype: 'Resident',
    state: 'idle',
    direction: 1,
    moving: false,
    x: 0,
    y: 0,
  };

  const dialogList = archetypesDialogs[npc.archetype] || archetypesDialogs.Resident;
  const quote = dialogList[Math.abs(npc.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % dialogList.length];

  return (
    <ModalWrapper
      title={`Trò chuyện với ${npc.name}`}
      badge={`Nghề nghiệp: ${npc.archetype}`}
      icon="💬"
      onClose={onClose}
      width="500px"
    >
      <div className="npc-dialog-card card-panel">
        <div className="npc-avatar-box">
          <ChibiAvatar index={npc.avatar} size={64} />
        </div>
        <div className="npc-dialog-bubble">
          <p className="dialog-quote">“{quote}”</p>
        </div>
      </div>
      <div className="action-row mt-3">
        <button className="btn-primary" onClick={onClose}>
          Tạm biệt! Chúc ngày mới tốt lành
        </button>
      </div>
    </ModalWrapper>
  );
}
