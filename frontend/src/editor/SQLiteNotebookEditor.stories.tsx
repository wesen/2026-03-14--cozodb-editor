import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { SQLiteNotebookEditor } from "./SQLiteNotebookEditor";

function StoryRender({ value: initialValue, ...args }: ComponentProps<typeof SQLiteNotebookEditor>) {
  const [value, setValue] = useState(initialValue);

  return (
    <div style={{ width: 860 }}>
      <SQLiteNotebookEditor
        {...args}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

const meta = {
  title: "Editor/SQLiteNotebookEditor",
  component: SQLiteNotebookEditor,
  parameters: {
    layout: "padded",
  },
  render: (args) => <StoryRender {...args} />,
  args: {
    autoFocus: false,
    onBlur: () => undefined,
    onChange: () => undefined,
    onFocus: () => undefined,
    onRun: () => undefined,
    onRunAndInsert: () => undefined,
    placeholder: "-- Enter SQL...",
    value: `create table users (
  id integer primary key,
  name text not null,
  age integer not null
);

select name, age
from users
where age > 30
order by age desc;`,
  },
} satisfies Meta<typeof SQLiteNotebookEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithJoin: Story = {
  args: {
    value: `select u.name, count(*) as order_count
from users u
join orders o on o.user_id = u.id
group by u.name
having count(*) > 1
order by order_count desc;`,
  },
};
