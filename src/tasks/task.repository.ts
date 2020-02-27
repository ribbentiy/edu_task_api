import { EntityRepository, Repository } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from './task-status.enum';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { User } from '../auth/user.entity';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { tryCatch } from 'rxjs/internal-compatibility';

@EntityRepository(Task)
export class TaskRepository extends Repository<Task> {
  private logger = new Logger('Task Repository');

  async getTasks(
    filterDto:GetTasksFilterDto,
    user: User,
  ):Promise<Task[]> {
    const { search, status } = filterDto;
    const query = this.createQueryBuilder('task');

    query.where('task.userId = :userId', { userId: user.id });

    if (status) {
      query.andWhere('task.status = :status', { status })
    }

    if (search) {
      query.andWhere('(task.title LIKE :search OR task.description LIKE :search)', { search: `%${search}%` })
    }
    try {
      const tasks = await query.getMany();
      return tasks;
    } catch (error) {
      this.logger.error(`Failed to get tasks for the user "${user.username}", DTO: ${JSON.stringify(filterDto)}`, error.stack);
      throw new InternalServerErrorException()

    }

  }

  async createTask(
    createTaskDto: CreateTaskDto,
    user: User
  ): Promise<Task> {
    const { title, description } = createTaskDto;

    const task = new Task();
    task.user = user;
    task.title = title;
    task.description = description;
    task.status = TaskStatus.OPEN;

    try {
      await task.save();
    } catch (error) {
      this.logger.error(`Failed to save task for the user "${user.username}", Data: ${JSON.stringify(createTaskDto)}`, error.stack);
      throw new InternalServerErrorException()
    }

    delete task.user;

    return task;
  }
}